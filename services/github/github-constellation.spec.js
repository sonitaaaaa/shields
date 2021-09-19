import { expect } from 'chai'
import sinon from 'sinon'
import log from '../../core/server/log.js'
import RedisTokenPersistence from '../../core/token-pooling/redis-token-persistence.js'
import GithubConstellation from './github-constellation.js'
import GithubApiProvider from './github-api-provider.js'

describe('GithubConstellation', function () {
  const tokens = [
    'abc123',
    'def4567.scopes.read:packages%20read:user',
    'def789.scopes.read:packages',
    'ghi012',
    'fff444.scopes.read:packages',
    '555eee.scopes.read:packages',
    'ddd666',
    '777ccc',
    'bbb888',
    '999aaa',
    '000111.scopes.read:packages',
    '222333.scopes.read:packages',
    '111111',
    '888888',
  ]
  const config = {
    private: {
      redis_url: 'localhost',
    },
    service: {
      debug: {
        enabled: false,
      },
    },
  }
  const server = { ajax: { on: sinon.stub() } }

  beforeEach(function () {
    sinon.stub(log, 'log')
    sinon
      .stub(GithubConstellation, '_createOauthHelper')
      .returns({ isConfigured: false })
    sinon.stub(GithubConstellation.prototype, 'scheduleDebugLogging')
    sinon.stub(RedisTokenPersistence.prototype, 'initialize').returns(tokens)
    sinon.stub(RedisTokenPersistence.prototype, 'noteTokenAdded')
    sinon.stub(RedisTokenPersistence.prototype, 'noteTokenRemoved')
  })

  afterEach(function () {
    sinon.restore()
  })

  context('initialize', function () {
    it('does not fetch tokens when pooling disabled', async function () {
      const constellation = new GithubConstellation({
        ...config,
        ...{ private: { gh_token: 'secret' } },
      })
      await constellation.initialize(server)
      expect(RedisTokenPersistence.prototype.initialize).not.to.have.been.called
    })

    it('loads both scoped and unscoped tokens', async function () {
      sinon.spy(GithubApiProvider.prototype, 'addReservedScopedToken')
      const constellation = new GithubConstellation(config)
      await constellation.initialize(server)
      expect(constellation.apiProvider.graphqlTokens.count()).to.equal(12)
      expect(constellation.apiProvider.searchTokens.count()).to.equal(12)
      expect(constellation.apiProvider.standardTokens.count()).to.equal(12)
      expect(constellation.apiProvider.packageScopedTokens.count()).to.equal(2)
      expect(
        GithubApiProvider.prototype.addReservedScopedToken
      ).to.be.calledWithExactly('def4567', {
        scopes: 'read:packages%20read:user',
      })
      expect(
        GithubApiProvider.prototype.addReservedScopedToken
      ).to.be.calledWithExactly('def789', {
        scopes: 'read:packages',
      })
    })
  })

  context('onTokenAdded', function () {
    it('adds new scoped token', async function () {
      const clock = sinon.useFakeTimers()
      // const constellation = new GithubConstellation(config)
      // await constellation.initialize(server)
      // constellation.onTokenInvalidated('def789')
      // await clock.tickAsync()
      // expect(RedisTokenPersistence.prototype.noteTokenRemoved).to.be.calledWith('def789.scopes.read:packages')
      // expect(Object.keys(constellation._tokenScopes).length).to.equal(13)
    })

    it('adds new unscoped token', async function () {})

    it('updates scopes on existing token', async function () {})
  })

  context('onTokenInvalidated', function () {
    it('removes scoped token', async function () {
      const clock = sinon.useFakeTimers()
      const constellation = new GithubConstellation(config)
      await constellation.initialize(server)
      constellation.onTokenInvalidated('def789')
      await clock.tickAsync()
      expect(RedisTokenPersistence.prototype.noteTokenRemoved).to.be.calledWith(
        'def789.scopes.read:packages'
      )
      expect(Object.keys(constellation._tokenScopes).length).to.equal(13)
    })

    it('removes unscoped token', async function () {
      const clock = sinon.useFakeTimers()
      const constellation = new GithubConstellation(config)
      await constellation.initialize(server)
      constellation.onTokenInvalidated('888888')
      await clock.tickAsync()
      expect(RedisTokenPersistence.prototype.noteTokenRemoved).to.be.calledWith(
        '888888'
      )
      expect(Object.keys(constellation._tokenScopes).length).to.equal(13)
    })
  })
})
