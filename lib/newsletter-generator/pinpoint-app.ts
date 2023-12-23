import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { CfnApp, CfnEmailChannel } from 'aws-cdk-lib/aws-pinpoint'
import { Construct } from 'constructs'
import { Stack } from 'aws-cdk-lib'

export class PinpointApp extends Construct {
  public readonly pinpointAppId: string
  public readonly pinpointProjectAdminPolicy: Policy
  public readonly pinpointSubscribeUserToNewsletterPolicyStatement: PolicyStatement
  public readonly pinpointAddNewsletterSegmentPolicyStatement: PolicyStatement
  constructor (scope: Construct, id: string) {
    super(scope, id)

    const pinpointIdentity = this.node.tryGetContext('pinpointIdentity')

    const stackDetails = Stack.of(this)
    const pinpointApp = new CfnApp(this, 'PinpointApp', {
      name: 'GenAINewsletter'
    })
    this.pinpointAppId = pinpointApp.ref

    new CfnEmailChannel(this, 'PinpointEmailChannel', {
      applicationId: this.pinpointAppId,
      enabled: true,
      fromAddress: 'awsrudy@amazon.com', // TODO Make this parameterized
      identity: pinpointIdentity

    })

    const pinpointProjectAdminPolicy = new Policy(this, 'PinpointProjectAdmin', {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['mobiletargeting:GetApps'],
          resources: [`arn:aws:mobiletargeting:${stackDetails.region}:${stackDetails.account}`]
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'mobiletargeting:*'
          ],
          resources: [
            `arn:aws:mobiletargeting:${stackDetails.region}:${stackDetails.account}:apps/${this.pinpointAppId}`,
            `arn:aws:mobiletargeting:${stackDetails.region}:${stackDetails.account}:apps/${this.pinpointAppId}/*`,
            `arn:aws:mobiletargeting:${stackDetails.region}:${stackDetails.account}:reports`
          ]
        })
      ]
    })

    const pinpointAddNewsletterSegmentPolicyStatement =
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'mobiletargeting:CreateSegment',
            'mobiletargeting:GetSegment'
          ],
          resources: [
                  `arn:aws:mobiletargeting:${stackDetails.region}:${stackDetails.account}:apps/${this.pinpointAppId}`,
                  `arn:aws:mobiletargeting:${stackDetails.region}:${stackDetails.account}:apps/${this.pinpointAppId}/segments/*`
          ]
        })

    const pinpointSubscribeUserToNewsletterPolicyStatement =
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'mobiletargeting:UpdateEndpoint',
            'mobiletargeting:GetEndpoint',
            'mobiletargeting:GetUserEndpoints'
          ],
          resources: [
            `arn:aws:mobiletargeting:${stackDetails.region}:${stackDetails.account}:apps/${this.pinpointAppId}`,
            `arn:aws:mobiletargeting:${stackDetails.region}:${stackDetails.account}:apps/${this.pinpointAppId}/*`
          ]
        })

    this.pinpointProjectAdminPolicy = pinpointProjectAdminPolicy
    this.pinpointAddNewsletterSegmentPolicyStatement = pinpointAddNewsletterSegmentPolicyStatement
    this.pinpointSubscribeUserToNewsletterPolicyStatement = pinpointSubscribeUserToNewsletterPolicyStatement
  }
}
