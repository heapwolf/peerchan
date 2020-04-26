import sodium from 'sodium-universal'
import * as _bs58 from 'bs58'
import Protocol, { Message } from '@peerlinks/protocol'
import Swarm from '@peerlinks/swarm'

const bs58 = _bs58.default
const DISPLAY_COUNT = 30
const INVITE_TIMEOUT = 15 * 60 * 1000 // 15 minutes

class Network {
  constructor (ee, options = {}) {
    this.options = options
    this.storage = options.storage
    this.log = options.log
    this.swarm = null
    this.events = ee

    this.protocol = new Protocol({
      storage: options.storage,
      passphrase: 'test',
      sodium
    })

    this.identity = null
    this.channel = null
    this.channelWait = null
    const rnum = Math.random().toString(16).slice(2, 8)
    this.randomName = `user${rnum}`

    this.events.on('network', (method, ...args) => {
      this[method] && this[method](...args)
    })
  }

  async init () {
    await this.protocol.load()

    this.swarm = new Swarm(this.protocol)
    this.log.info('Initialized swarm')
  }

  async iam ({ name = this.randomName }) {
    let channel

    const existing = this.protocol.getIdentity(name)

    if (existing) {
      this.identity = existing
      channel = this.protocol.getChannel(name)
    } else {
      [this.identity, channel] =
        await this.protocol.createIdentityPair(name)
    }

    this.ch({ name: channel.name })

    const message = existing
      ? `Using identity: "${name}"`
      : `Created identity: "${name}"`

    this.log.info(message)
  }

  async accept ({ inviteeName, request }) {
    if (!this.identity) {
      return this.log.warn('identity not set')
    }

    this.log.info(`trying to accept invite, ${inviteeName}, ${request}`)
    request = bs58.decode(request)

    const {
      encryptedInvite,
      peerId
    } = this.identity.issueInvite(this.channel, request, inviteeName)

    await this.swarm.sendInvite({
      peerId,
      encryptedInvite
    }, INVITE_TIMEOUT)

    return this.log.info('issued invite')
  }

  async request () {
    if (!this.identity) {
      return this.log.error({ message: 'iam() must be called first' })
    }

    const {
      requestId,
      request,
      decrypt
    } = this.identity.requestInvite(this.protocol.id)

    const request58 = JSON.stringify(bs58.encode(request))
    const trusteeName = JSON.stringify(this.identity.name)

    this.events.emit('network:request', {
      trusteeName,
      request58
    })

    const encryptedInvite =
      await this.swarm.waitForInvite(requestId, INVITE_TIMEOUT)
    const invite = decrypt(encryptedInvite)

    const channel =
      await this.protocol.channelFromInvite(invite, this.identity)

    // Join channel's swarm to start synchronization
    await this.ch({ name: channel.name })

    return this.events.emit('data', {
      joined: true,
      name: this.channel.name,
      message: `Joined ${this.channel.name}`
    })
  }

  async post ({ text }) {
    if (!this.identity) {
      return this.events.emit('error', { message: '`iam()` must be called first' })
    }

    const body = Message.json({ text })
    await this.channel.post(body, this.identity)
    await this.displayChannel()

    return this.log.info('Successfully posted message')
  }

  channels () {
    this.events.emit('network:channels', this.protocol.getChannelNames())
  }

  identities () {
    this.events.emit('network:identities', this.protocol.getIdentityNames())
  }

  async ch ({ name }) {
    if (this.channelWait) {
      this.channelWait.cancel()
      this.channelWait = null
    }

    const channel = this.protocol.getChannel(name)

    if (!channel) {
      return this.events.emit('error', { message: `Unknown channel, '${name}'. Request an invite?` })
    }

    const loop = async () => {
      this.channelWait = channel.waitForIncomingMessage()

      try {
        await this.channelWait
        this.channelWait = null

        // Bell sound
        process.stdout.write('\u0007')

        try {
          this.displayChannel()
        } catch (err) {
          // ignore
        }

        loop()
      } catch (err) {
        // ignore
      }
    }

    this.channel = channel
    this.swarm.joinChannel(channel)

    loop()

    await this.displayChannel()

    return { data: { joined: true } }
  }

  async displayChannel () {
    const ch = this.channel
    const messages = await ch.getReverseMessagesAtOffset(0, DISPLAY_COUNT)

    this.events.emit('messages', {
      channel: this.channel,
      publicKey: bs58.encode(this.channel.publicKey),
      lines: messages.slice().reverse()
    })
  }
}

export default Network
