import { Collection } from '@discordjs/collection';
import { PresenceShow } from 'stanza/Constants';
import Base from '../client/Base';
import Friend from './friend/Friend';
import IncomingPendingFriend from './friend/IncomingPendingFriend';
import OutgoingPendingFriend from './friend/OutgoingPendingFriend';
import FriendNotFoundError from '../exceptions/FriendNotFoundError';
import Endpoints from '../../resources/Endpoints';
import { PresenceOnlineType } from '../../resources/structs';
import UserNotFoundError from '../exceptions/UserNotFoundError';
import DuplicateFriendshipError from '../exceptions/DuplicateFriendshipError';
import FriendshipRequestAlreadySentError from '../exceptions/FriendshipRequestAlreadySentError';
import InviteeFriendshipsLimitExceededError from '../exceptions/InviteeFriendshipsLimitExceededError';
import InviteeFriendshipRequestLimitExceededError from '../exceptions/InviteeFriendshipRequestLimitExceededError';
import InviteeFriendshipSettingsError from '../exceptions/InviteeFriendshipSettingsError';
import OfferNotFoundError from '../exceptions/OfferNotFoundError';
import SendMessageError from '../exceptions/SendMessageError';
import SentFriendMessage from './friend/SentFriendMessage';
import ClientUser from './user/ClientUser';
import Client from '../client/Client';
import BlockedUser from './user/BlockedUser';
import BasePendingFriend from './friend/BasePendingFriend';

class FriendsManager extends Base {
  /**
   * Friend list
   */
  public friends: Collection<string, Friend>;

  /**
   * Pending friend requests (incoming or outgoing)
   */
  public pendingFriends: Collection<
    string,
    IncomingPendingFriend | OutgoingPendingFriend
  >;

  constructor(constr: Client) {
    super(constr);
    this.friends = new Collection();
    this.pendingFriends = new Collection();
  }

  /**
   * Sets the clients XMPP status
   * @param status The status
   * @param onlineType The presence's online type (eg "away")
   * @param friend A specific friend you want to send this status to
   * @throws {FriendNotFoundError} The user does not exist or is not friends with the client
   */
  public setStatus(
    status?: string,
    onlineType?: PresenceOnlineType,
    friend?: string,
  ) {
    // eslint-disable-next-line no-undef-init
    let toJID: string | undefined = undefined;
    if (friend) {
      const resolvedFriend = this.friends.find(
        (f: Friend) => f.displayName === friend || f.id === friend,
      );
      if (!resolvedFriend) throw new FriendNotFoundError(friend);
      toJID = `${resolvedFriend.id}@${Endpoints.EPIC_PROD_ENV}`;
    }

    // eslint-disable-next-line no-undef-init
    let partyJoinInfoData: { [key: string]: any } | undefined = undefined;
    if (this.client.party) {
      const partyPrivacy = this.client.party.config.privacy;
      if (
        partyPrivacy.presencePermission === 'Noone'
        || (partyPrivacy.presencePermission === 'Leader'
          && !this.client.party.me?.isLeader)
      ) {
        partyJoinInfoData = {
          isPrivate: true,
        };
      } else {
        partyJoinInfoData = {
          sourceId: this.client.user?.id,
          sourceDisplayName: this.client.user?.displayName,
          sourcePlatform: this.client.config.platform,
          partyId: this.client.party.id,
          partyTypeId: 286331153,
          key: 'k',
          appId: 'Fortnite',
          buildId: this.client.config.partyBuildId,
          partyFlags: -2024557306,
          notAcceptingReason: 0,
          pc: this.client.party.size,
        };
      }
    }

    if (status && !toJID) this.client.config.defaultStatus = status;
    if (onlineType && !toJID) this.client.config.defaultOnlineType = onlineType;

    const rawStatus = {
      Status:
        status
        || this.client.config.defaultStatus
        || (this.client.party
          && `Battle Royale Lobby - ${this.client.party.size} / ${this.client.party.maxSize}`)
        || 'Playing Battle Royale',
      bIsPlaying: false,
      bIsJoinable:
        this.client.party
        && !this.client.party.isPrivate
        && this.client.party.size !== this.client.party.maxSize,
      bHasVoiceSupport: false,
      SessionId: '',
      ProductName: 'Fortnite',
      Properties: {
        'party.joininfodata.286331153_j': partyJoinInfoData,
        FortBasicInfo_j: {
          homeBaseRating: 0,
        },
        FortLFG_I: '0',
        FortPartySize_i: 1,
        FortSubGame_i: 1,
        InUnjoinableMatch_b: false,
        FortGameplayStats_j: {
          state: '',
          playlist: 'None',
          numKills: 0,
          bFellToDeath: false,
        },
      },
    };

    const rawOnlineType = (onlineType || this.client.config.defaultOnlineType) === 'online'
      ? undefined
      : onlineType || this.client.config.defaultOnlineType;

    return this.client.xmpp.sendStatus(
      rawStatus,
      rawOnlineType as PresenceShow | undefined,
      toJID,
    );
  }

  /**
   * Resets the client's XMPP status and online type
   */
  public async resetStatus() {
    this.client.config.defaultStatus = undefined;
    this.client.config.defaultOnlineType = 'online';

    return this.setStatus();
  }

  /**
   * Sends a friendship request to a user or accepts an existing request
   * @param friend The id or display name of the user to add
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {DuplicateFriendshipError} The user is already friends with the client
   * @throws {FriendshipRequestAlreadySentError} A friendship request has already been sent to the user
   * @throws {InviterFriendshipsLimitExceededError} The client's friendship limit is reached
   * @throws {InviteeFriendshipsLimitExceededError} The user's friendship limit is reached
   * @throws {InviteeFriendshipSettingsError} The user disabled friend requests
   * @throws {InviteeFriendshipRequestLimitExceededError} The user's incoming friend request limit is reached
   * @throws {EpicgamesAPIError}
   */
  public async addFriend(friend: string) {
    const userID = await this.resolveUserId(friend);
    if (!userID) throw new UserNotFoundError(friend);

    const addFriend = await this.client.http.sendEpicgamesRequest(
      true,
      'POST',
      `${Endpoints.FRIEND_ADD}/${this.client.user?.id}/${userID}`,
      'fortnite',
    );

    if (addFriend.error) {
      switch (addFriend.error.code) {
        case 'errors.com.epicgames.friends.duplicate_friendship':
          throw new DuplicateFriendshipError(friend);
        case 'errors.com.epicgames.friends.friend_request_already_sent':
          throw new FriendshipRequestAlreadySentError(friend);
        case 'errors.com.epicgames.friends.inviter_friendships_limit_exceeded':
          throw new InviteeFriendshipsLimitExceededError(friend);
        case 'errors.com.epicgames.friends.invitee_friendships_limit_exceeded':
          throw new InviteeFriendshipsLimitExceededError(friend);
        case 'errors.com.epicgames.friends.incoming_friendships_limit_exceeded':
          throw new InviteeFriendshipRequestLimitExceededError(friend);
        case 'errors.com.epicgames.friends.cannot_friend_due_to_target_settings':
          throw new InviteeFriendshipSettingsError(friend);
        case 'errors.com.epicgames.friends.account_not_found':
          throw new UserNotFoundError(friend);
        default:
          throw addFriend.error;
      }
    }
  }

  /**
   * Removes a friend from the client's friend list or declines / aborts a pending friendship request
   * @param friend The id or display name of the friend
   * @throws {FriendNotFoundError} The user does not exist or is not friends with the client
   * @throws {EpicgamesAPIError}
   */
  public async removeFriend(friend: string) {
    let resolvedFriend:
      | Friend
      | OutgoingPendingFriend
      | IncomingPendingFriend
      | undefined;
    resolvedFriend = this.friends.find(
      (f: Friend) => f.displayName === friend || f.id === friend,
    );
    if (!resolvedFriend) {
      resolvedFriend = this.pendingFriends.find(
        (f: BasePendingFriend) => f.displayName === friend || f.id === friend,
      );
    }

    if (!resolvedFriend) throw new FriendNotFoundError(friend);

    const removeFriend = await this.client.http.sendEpicgamesRequest(
      true,
      'DELETE',
      `${Endpoints.FRIEND_DELETE}/${this.client.user?.id}/friends/${resolvedFriend.id}`,
      'fortnite',
    );
    if (removeFriend.error) throw removeFriend.error;
  }

  /**
   * Fetches the friends the client shares with a friend
   * @param friend The id or display name of the friend
   * @throws {FriendNotFoundError} The user does not exist or is not friends with the client
   * @throws {EpicgamesAPIError}
   */
  public async getMutualFriends(friend: string): Promise<Friend[]> {
    const resolvedFriend = this.friends.find(
      (f: Friend) => f.displayName === friend || f.id === friend,
    );
    if (!resolvedFriend) throw new FriendNotFoundError(friend);

    const mutualFriends = await this.client.http.sendEpicgamesRequest(
      true,
      'GET',
      `${Endpoints.FRIENDS}/${this.client.user?.id}/friends/${resolvedFriend.id}/mutual`,
      'fortnite',
    );
    if (mutualFriends.error) throw mutualFriends.error;

    return mutualFriends.response
      .map((f: string) => this.friends.get(f))
      .filter((f: Friend | undefined) => !!f);
  }

  /**
   * Checks whether a friend owns a specific offer
   * @param friend The id or display name of the friend
   * @param offerId The offer id
   * @throws {OfferNotFoundError} The offer does not exist or is not in the current storefront catalog
   * @throws {FriendNotFoundError} The user does not exist or is not friends with the client
   * @throws {EpicgamesAPIError}
   */
  public async checkFriendOfferOwnership(friend: string, offerId: string) {
    const resolvedFriend = this.friends.find(
      (f: Friend) => f.displayName === friend || f.id === friend,
    );
    if (!resolvedFriend) throw new FriendNotFoundError(friend);

    const giftData = await this.client.http.sendEpicgamesRequest(
      true,
      'GET',
      `${Endpoints.BR_GIFT_ELIGIBILITY}/recipient/${resolvedFriend.id}`
        + `/offer/${encodeURIComponent(offerId)}`,
      'fortnite',
    );

    if (giftData.error) {
      if (
        giftData.error.code
        === 'errors.com.epicgames.modules.gamesubcatalog.catalog_out_of_date'
      ) { throw new OfferNotFoundError(offerId); }
      if (
        giftData.error.code
        === 'errors.com.epicgames.modules.gamesubcatalog.purchase_not_allowed'
      ) { return true; }

      throw giftData.error;
    }

    return false;
  }

  /**
   * Blocks a user
   * @param user The id or display name of the user
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {EpicgamesAPIError}
   */
  public async blockUser(user: string) {
    const userID = await this.resolveUserId(user);
    if (!userID) throw new UserNotFoundError(user);

    const blockUser = await this.client.http.sendEpicgamesRequest(
      true,
      'POST',
      `${Endpoints.FRIEND_BLOCK}/${this.client.user?.id}/${userID}`,
      'fortnite',
    );
    if (blockUser.error) throw blockUser.error;
  }

  /**
   * Unblocks a user
   * @param user The id or display name of the user
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {EpicgamesAPIError}
   */
  public async unblockUser(user: string) {
    const blockedUser = this.client.blockedUsers.find(
      (u: BlockedUser) => u.displayName === user || u.id === user,
    );
    if (!blockedUser) throw new UserNotFoundError(user);

    const unblockUser = await this.client.http.sendEpicgamesRequest(
      true,
      'DELETE',
      `${Endpoints.FRIEND_BLOCK}/${this.client.user?.id}/${blockedUser.id}`,
      'fortnite',
    );
    if (unblockUser.error) throw unblockUser.error;
  }

  /**
   * Sends a message to a friend
   * @param friend The id or display name of the friend
   * @param content The message that will be sent
   * @throws {FriendNotFoundError} The user does not exist or is not friends with the client
   * @throws {SendMessageError} The messant could not be sent
   */
  public async sendFriendMessage(friend: string, content: string) {
    const resolvedFriend = this.friends.find(
      (f: Friend) => f.displayName === friend || f.id === friend,
    );
    if (!resolvedFriend) throw new FriendNotFoundError(friend);

    if (!this.client.xmpp.isConnected) {
      throw new SendMessageError(
        "You're not connected via XMPP",
        'FRIEND',
        resolvedFriend,
      );
    }

    const message = await this.client.xmpp.sendMessage(
      `${resolvedFriend.id}@${Endpoints.EPIC_PROD_ENV}`,
      content,
    );

    if (!message) {
      throw new SendMessageError(
        'Message timeout exceeded',
        'FRIEND',
        resolvedFriend,
      );
    }

    return new SentFriendMessage(this.client, {
      author: this.client.user as ClientUser,
      content,
      id: message.id as string,
      sentAt: new Date(),
    });
  }

  /**
   * Resolves a single user id
   * @param query Display name or id of the account's id to resolve
   */
  private async resolveUserId(query: string) {
    if (query.length === 32) return query;
    return (await this.client.getProfile(query))?.id;
  }
}

export default FriendsManager;
