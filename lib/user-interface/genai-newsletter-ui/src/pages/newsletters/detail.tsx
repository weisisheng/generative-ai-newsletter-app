import { useCallback, useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppContext } from '../../common/app-context'
import { ApiClient } from '../../common/api'
import {
  ArticleSummaryType,
  DataFeedSubscription,
  Newsletter
} from '@shared/api/API'
import BaseAppLayout from '../../components/base-app-layout'
import {
  BreadcrumbGroup,
  Container,
  SpaceBetween,
  SplitPanel,
  StatusIndicator
} from '@cloudscape-design/components'
import useOnFollow from '../../common/hooks/use-on-follow'
import NewsletterReviewForm from '../../components/newsletters/forms/newsletter-review'
import NewsletterEmailsTable from '../../components/newsletters/newsletter-emails-table'
import UserSubscriberData from '../../components/newsletters/user-subscriber-data'
import BaseContentLayout from '../../components/base-content-layout'
import NewsletterPreview from '../../components/newsletters/preview'
import { NewsletterStyle } from '@shared/common/newsletter-style'

export default function NewsletterDetail() {
  const { newsletterId } = useParams()
  const onFollow = useOnFollow()
  const appContext = useContext(AppContext)
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null)
  const [newsletterStyle, setNewsletterStyle] = useState<NewsletterStyle>(
    new NewsletterStyle()
  )
  const [splitPanelOpen, setSplitPanelOpen] = useState<boolean>(false)

  const getNewsletter = useCallback(async () => {
    if (!appContext) {
      return
    }
    if (!newsletterId) {
      return
    }
    const apiClient = new ApiClient(appContext)
    const result = await apiClient.newsletters.getNewsletter(newsletterId)
    if (result.errors) {
      console.error(result.errors)
    } else {
      setNewsletter(result.data.getNewsletter)
      if (
        result.data.getNewsletter.newsletterStyle !== null &&
        result.data.getNewsletter.newsletterStyle !== undefined
      ) {
        setNewsletterStyle(
          JSON.parse(result.data.getNewsletter.newsletterStyle)
        )
      }
    }
  }, [appContext, newsletterId])

  useEffect(() => {
    getNewsletter()
  }, [newsletterId, getNewsletter])

  return (
    <BaseAppLayout
      breadcrumbs={
        <BreadcrumbGroup
          onFollow={onFollow}
          items={[
            {
              text: 'GenAI Newsletter',
              href: '/'
            },
            {
              text: 'Newsletters',
              href: '/newsletters'
            },
            {
              text: 'Newsletter Details',
              href: `/newsletters/${newsletterId}`
            }
          ]}
        />
      }
      splitPanelPreferences={{ position: 'side' }}
      splitPanelOpen={splitPanelOpen}
      onSplitPanelToggle={({ detail }) => {
        setSplitPanelOpen(detail.open)
      }}
      splitPanel={
        <SplitPanel
          header="Preview Newsletter Style"
          hidePreferencesButton={true}
        >
          <NewsletterPreview previewMode={true} styleProps={newsletterStyle} />
        </SplitPanel>
      }
      content={
        <BaseContentLayout>
          <SpaceBetween direction="vertical" size="m">
            <Container>
              {newsletter != undefined && newsletter.subscriptions !== null ? (
                <NewsletterReviewForm
                  discoverable={newsletter?.discoverable ?? false}
                  numberOfDaysToInclude={newsletter.numberOfDaysToInclude}
                  selectedSubscriptions={
                    newsletter.subscriptions as DataFeedSubscription[]
                  }
                  shared={newsletter.shared ?? false}
                  title={newsletter.title}
                  formMode="detail"
                  newsletterIntroPrompt={
                    newsletter.newsletterIntroPrompt !== null &&
                    newsletter.newsletterIntroPrompt !== undefined &&
                    newsletter.newsletterIntroPrompt.length > 0
                      ? newsletter.newsletterIntroPrompt
                      : undefined
                  }
                  articleSummaryType={
                    newsletter.articleSummaryType !== undefined &&
                    newsletter.articleSummaryType !== null
                      ? newsletter.articleSummaryType
                      : ArticleSummaryType.SHORT_SUMMARY
                  }
                  templatePreview={{
                    setSplitPanelOpen,
                    splitPanelOpen
                  }}
                />
              ) : (
                <>
                  <StatusIndicator type="loading">Loading...</StatusIndicator>
                </>
              )}
            </Container>
            <Container>
              <UserSubscriberData />
            </Container>
            <Container>
              <NewsletterEmailsTable />
            </Container>
          </SpaceBetween>
        </BaseContentLayout>
      }
    />
  )
}
