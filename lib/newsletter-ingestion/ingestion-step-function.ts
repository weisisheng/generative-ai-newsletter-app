import * as cdk from 'aws-cdk-lib'
import { type StackProps } from 'aws-cdk-lib'
import { type Table } from 'aws-cdk-lib/aws-dynamodb'
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { ApplicationLogLevel, LambdaInsightsVersion, LogFormat, Tracing } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { type Bucket } from 'aws-cdk-lib/aws-s3'
import { DefinitionBody, JsonPath, Map, StateMachine, TaskInput } from 'aws-cdk-lib/aws-stepfunctions'
import { DynamoAttributeValue, DynamoGetItem, LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks'
import { Construct } from 'constructs'

interface IngestionStepFunctionProps extends StackProps {
  newsletterTable: Table
  dataIngestBucket: Bucket
}

export class IngestionStepFunction extends Construct {
  public readonly stateMachine: StateMachine
  constructor (scope: Construct, id: string, props: IngestionStepFunctionProps) {
    super(scope, id)

    const feedReaderFunction = new NodejsFunction(this, 'feed-reader', {
      description: 'Function responsible for reading feeds and return the articles for ingestion',
      handler: 'handler',
      tracing: Tracing.ACTIVE,
      logFormat: LogFormat.JSON,
      logRetention: RetentionDays.ONE_WEEK,
      applicationLogLevel: ApplicationLogLevel.DEBUG,
      insightsVersion: LambdaInsightsVersion.VERSION_1_0_229_0,
      environment: {
        POWERTOOLS_LOG_LEVEL: 'DEBUG'
      },
      timeout: cdk.Duration.minutes(5)
    })

    const filterIngestedArticlesFunction = new NodejsFunction(this, 'filter-ingested-articles', {
      description: 'Function responsible for filtering out already ingested articles',
      handler: 'handler',
      tracing: Tracing.ACTIVE,
      logFormat: LogFormat.JSON,
      logRetention: RetentionDays.ONE_WEEK,
      applicationLogLevel: ApplicationLogLevel.DEBUG,
      insightsVersion: LambdaInsightsVersion.VERSION_1_0_229_0,
      timeout: cdk.Duration.minutes(5),
      environment: {
        NEWSLETTER_TABLE: props.newsletterTable.tableName
      }

    })

    const articleIngestionFunction = new NodejsFunction(this, 'article-ingestor', {
      description: 'Function responsible for ingesting each article\'s content, summarizing it, and storing the data in DDB',
      handler: 'handler',
      tracing: Tracing.ACTIVE,
      logFormat: LogFormat.JSON,
      logRetention: RetentionDays.ONE_WEEK,
      applicationLogLevel: ApplicationLogLevel.DEBUG,
      insightsVersion: LambdaInsightsVersion.VERSION_1_0_229_0,
      environment: {
        INGEST_BUCKET: props.dataIngestBucket.bucketName,
        POWERTOOLS_LOG_LEVEL: 'DEBUG',
        NEWSLETTER_TABLE: props.newsletterTable.tableName
      },
      timeout: cdk.Duration.minutes(5)
    })
    articleIngestionFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
        effect: Effect.ALLOW
      })
    )
    // Define the tasks the step function will execute
    const getSubscriptionDetailsJob = new DynamoGetItem(this, 'GetSubscriptionDetails', {
      key: {
        subscriptionId: DynamoAttributeValue.fromString(JsonPath.stringAt('$.subscriptionId')),
        compoundSortKey: DynamoAttributeValue.fromString(JsonPath.stringAt('$.subscriptionId'))
      },
      table: props.newsletterTable,
      resultSelector: {
        url: JsonPath.stringAt('$.Item.url.S'),
        id: JsonPath.stringAt('$.Item.subscriptionId.S'),
        feedType: JsonPath.stringAt('$.Item.feedType.S')
      },
      resultPath: '$.subscription'
    })

    const readFeedJob = new LambdaInvoke(this, 'ReadFeed', {
      lambdaFunction: feedReaderFunction,
      payload: TaskInput.fromJsonPathAt('$.subscription'),
      resultSelector: {
        'articles.$': '$.Payload'
      },
      resultPath: '$.articlesData'
    })

    const filterIngestedArticlesJob = new LambdaInvoke(this, 'FilterIngestedArticles', {
      lambdaFunction: filterIngestedArticlesFunction,
      inputPath: JsonPath.stringAt('$'),
      payload: TaskInput.fromObject({
        subscriptionId: JsonPath.stringAt('$.subscriptionId'),
        articles: JsonPath.objectAt('$.articlesData.articles')
      }),
      resultSelector: {
        'articles.$': '$.Payload'
      },
      resultPath: '$.articlesData'
    })

    props.newsletterTable.grantReadData(filterIngestedArticlesFunction)

    const ingestArticleJob = new LambdaInvoke(this, 'IngestArticle', {
      lambdaFunction: articleIngestionFunction,
      payload: TaskInput.fromJsonPathAt('$')
    })

    const mapArticles = new Map(this, 'MapArticles', {
      itemsPath: '$.articlesData.articles'
    })

    mapArticles.iterator(ingestArticleJob)

    const definition = getSubscriptionDetailsJob
      .next(readFeedJob)
      .next(filterIngestedArticlesJob)
      .next(mapArticles)

    const stateMachine = new StateMachine(this, 'IngestionStateMachine', {
      definitionBody: DefinitionBody.fromChainable(definition)

    })
    props.newsletterTable.grantReadData(stateMachine)
    feedReaderFunction.grantInvoke(stateMachine)
    filterIngestedArticlesFunction.grantInvoke(stateMachine)
    articleIngestionFunction.grantInvoke(stateMachine)
    props.newsletterTable.grantWriteData(articleIngestionFunction)
    props.dataIngestBucket.grantPut(stateMachine)
    this.stateMachine = stateMachine
  }
}