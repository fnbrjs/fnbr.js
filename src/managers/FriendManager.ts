import { Collection } from '@discordjs/collection';
import Friend from '../structures/friend/Friend';
import FriendNotFoundError from '../exceptions/FriendNotFoundError';
import Endpoints from '../../resources/Endpoints';
import UserNotFoundError from '../exceptions/UserNotFoundError';
import DuplicateFriendshipError from '../exceptions/DuplicateFriendshipError';
import FriendshipRequestAlreadySentError from '../exceptions/FriendshipRequestAlreadySentError';
import InviteeFriendshipsLimitExceededError from '../exceptions/InviteeFriendshipsLimitExceededError';
import InviteeFriendshipRequestLimitExceededError from '../exceptions/InviteeFriendshipRequestLimitExceededError';
import InviteeFriendshipSettingsError from '../exceptions/InviteeFriendshipSettingsError';
import OfferNotFoundError from '../exceptions/OfferNotFoundError';
import SendMessageError from '../exceptions/SendMessageError';
import SentFriendMessage from '../structures/friend/SentFriendMessage';
import BasePendingFriend from '../structures/friend/BasePendingFriend';
import Base from '../Base';
import { AuthSessionStoreKey } from '../../resources/enums';
import EpicgamesAPIError from '../exceptions/EpicgamesAPIError';
import type Client from '../Client';
import type OutgoingPendingFriend from '../structures/friend/OutgoingPendingFriend';
import type IncomingPendingFriend from '../structures/friend/IncomingPendingFriend';

class FriendManager extends Base {
  /**
   * Friend list
   */
  public list: Collection<string, Friend>;

  /**
   * Pending friend requests (incoming or outgoing)
   */
  public pendingList: Collection<string, IncomingPendingFriend | OutgoingPendingFriend>;

  constructor(constr: Client) {
    super(constr);
    this.list = new Collection();
    this.pendingList = new Collection();
  }

  public resolve(friend: string | Friend) {
    if (friend instanceof Friend) {
      return this.list.get(friend.id);
    }

    if (friend.length === 32) {
      return this.list.get(friend);
    }

    return this.list.find((f) => f.displayName === friend);
  }

  public resolvePending(pendingFriend: string | BasePendingFriend) {
    if (pendingFriend instanceof BasePendingFriend) {
      return this.pendingList.get(pendingFriend.id);
    }

    if (pendingFriend.length === 32) {
      return this.pendingList.get(pendingFriend);
    }

    return this.pendingList.find((f) => f.displayName === pendingFriend);
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
  public async add(friend: string) {
    const userID = await this.client.user.resolveId(friend);
    if (!userID) throw new UserNotFoundError(friend);

    try {
      await this.client.http.epicgamesRequest({
        method: 'POST',
        url: `${Endpoints.FRIEND_ADD}/${this.client.user.self!.id}/${userID}`,
      }, AuthSessionStoreKey.Fortnite);
    } catch (e) {
      if (e instanceof EpicgamesAPIError) {
        switch (e.code) {
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
        }
      }

      throw e;
    }
  }

  /**
   * Removes a friend from the client's friend list or declines / aborts a pending friendship request
   * @param friend The id or display name of the friend
   * @throws {FriendNotFoundError} The user does not exist or is not friends with the client
   * @throws {EpicgamesAPIError}
   */
  public async remove(friend: string) {
    const resolvedFriend = this.resolve(friend) ?? this.resolvePending(friend);
    if (!resolvedFriend) throw new FriendNotFoundError(friend);

    await this.client.http.epicgamesRequest({
      method: 'DELETE',
      url: `${Endpoints.FRIEND_DELETE}/${this.client.user.self!.id}/friends/${resolvedFriend.id}`,
    }, AuthSessionStoreKey.Fortnite);
  }

  /**
   * Fetches the friends the client shares with a friend
   * @param friend The id or display name of the friend
   * @throws {FriendNotFoundError} The user does not exist or is not friends with the client
   * @throws {EpicgamesAPIError}
   */
  public async getMutual(friend: string): Promise<Friend[]> {
    const resolvedFriend = this.resolve(friend);

    if (!resolvedFriend) throw new FriendNotFoundError(friend);

    const mutualFriends = await this.client.http.epicgamesRequest({
      method: 'GET',
      url: `${Endpoints.FRIENDS}/${this.client.user.self!.id}/friends/${resolvedFriend.id}/mutual`,
    }, AuthSessionStoreKey.Fortnite);

    return (mutualFriends as string[])
      .map((f) => this.list.get(f))
      .filter((f) => !!f) as Friend[];
  }

  /**
   * Checks whether a friend owns a specific offer
   * @param friend The id or display name of the friend
   * @param offerId The offer id
   * @throws {OfferNotFoundError} The offer does not exist or is not in the current storefront catalog
   * @throws {FriendNotFoundError} The user does not exist or is not friends with the client
   * @throws {EpicgamesAPIError}
   */
  public async checkOfferOwnership(friend: string, offerId: string) {
    const resolvedFriend = this.resolve(friend);
    if (!resolvedFriend) throw new FriendNotFoundError(friend);

    try {
      await this.client.http.epicgamesRequest({
        method: 'GET',
        url: `${Endpoints.BR_GIFT_ELIGIBILITY}/recipient/${resolvedFriend.id}/offer/${encodeURIComponent(offerId)}`,
      }, AuthSessionStoreKey.Fortnite);

      return false;
    } catch (e) {
      if (e instanceof EpicgamesAPIError) {
        if (e.code === 'errors.com.epicgames.modules.gamesubcatalog.catalog_out_of_date') {
          throw new OfferNotFoundError(offerId);
        }

        if (e.code === 'errors.com.epicgames.modules.gamesubcatalog.purchase_not_allowed') {
          return true;
        }
      }

      throw e;
    }
  }

  /**
   * Sends a message to a friend
   * @param friend The id or display name of the friend
   * @param content The message that will be sent
   * @throws {FriendNotFoundError} The user does not exist or is not friends with the client
   * @throws {SendMessageError} The messant could not be sent
   */
  public async sendMessage(friend: string, content: string) {
    const resolvedFriend = this.resolve(friend);
    if (!resolvedFriend) throw new FriendNotFoundError(friend);

    if (!this.client.xmpp.isConnected) {
      throw new SendMessageError('You\'re not connected via XMPP', 'FRIEND', resolvedFriend);
    }

    const message = await this.client.xmpp.sendMessage(
      `${resolvedFriend.id}@${Endpoints.EPIC_PROD_ENV}`,
      content,
    );

    if (!message) {
      throw new SendMessageError('Message timeout exceeded', 'FRIEND', resolvedFriend);
    }

    return new SentFriendMessage(this.client, {
      author: this.client.user.self!,
      content,
      id: message.id as string,
      sentAt: new Date(),
    });
  }
}

export default FriendManager;
