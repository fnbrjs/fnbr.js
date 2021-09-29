export default `
query FriendsQuery($displayNames: Boolean!) {
  Friends {
    summary(displayNames: $displayNames) {
      friends {
        alias
        note
        favorite
        ...friendFields
      }
      incoming {
        ...friendFields
      }
      outgoing {
        ...friendFields
      }
      blocklist {
        ...friendFields
      }
    }
  }
}

fragment friendFields on Friend {
  accountId
  displayName
  account {
    externalAuths {
      type
      accountId
      externalAuthId
      externalDisplayName
    }
  }
}
`;
