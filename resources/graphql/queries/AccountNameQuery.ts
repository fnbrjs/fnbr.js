export default `
query AccountQuery($displayName: String!) {
  Account {
    account(displayName: $displayName) {
      id
      displayName
      externalAuths {
        type
        accountId
        externalAuthId
        externalDisplayName
      }
    }
  }
}
`;
