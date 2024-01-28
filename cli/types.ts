export interface DeployConfig {
  stackName?: string
  env?: {
    account?: string
    region?: string
  }
  selfSignUpEnabled: boolean
  configVersion: string
  pinpointEmail: {
    verifiedIdentity: string
    senderAddress: string
  }
  appHostName?: {
    domainName: string
  }
  ui?: {
    sideNavigition?: Array<{
      title: string
      url: string
    }>
    headerLinks?: Array<{
      title: string
      url: string
    }>
  }
  auth?: {
    cognito: {
      userPoolId: string
      userPoolClientId: string
      userPoolDomain: string
      identityPoolId: string
      authenticatedUserArn: string
      oauth?: {
        customProvider?: string
        domain: string
        scope: string[]
        redirectSignIn: string
        redirectSignOut: string
        responseType: string
      }
    }

  }
}
