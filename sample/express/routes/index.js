var Evernote = require('evernote');

var config = require('../config.json');
var callbackUrl = "http://localhost:3000/oauth_callback";

/**
 * Set this as the lambda's token.
 * This is derived from the oAuthAccessToken which has a max expiry of 1 year.
 * @type {string}
 */

// home page
exports.index = async function(req, res) {
  try {
    if (config.TOKEN || req.session.oauthAccessToken) {
      var token = config.TOKEN || req.session.oauthAccessToken;
      var client = new Evernote.Client({
        token,
        sandbox: config.SANDBOX,
        china: config.CHINA
      });
      const noteStore = await client.getNoteStore()

      // List Notebooks
      const notebooks = await noteStore.listNotebooks()
      req.session.notebooks = notebooks;

      // List notes of the first notebook
      const filter = new Evernote.NoteStore.NoteFilter({
        notebookGuid: notebooks[0].guid,
        // words: ['one', 'two', 'three'],
        // ascending: true
      });
      const spec = new Evernote.NoteStore.NotesMetadataResultSpec({
        includeTitle: true,
        includeContentLength: true,
        includeCreated: true,
        includeUpdated: true,
        includeDeleted: true,
        includeUpdateSequenceNum: true,
        includeNotebookGuid: true,
        includeTagGuids: true,
        includeAttributes: true,
        includeLargestResourceMime: true,
        includeLargestResourceSize: true,
      });
      const notesMetadata = await noteStore.findNotesMetadata(filter, 0, 500, spec)
      req.session.notes = notesMetadata.notes

      // Render
      res.render('index', {session: req.session});
    } else {
      res.render('index', {session: req.session});
    }
  } catch (err) {
  	console.error('Error caught:', err)
  }
};

// OAuth
exports.oauth = function(req, res) {
  var client = new Evernote.Client({
    consumerKey: config.API_CONSUMER_KEY,
    consumerSecret: config.API_CONSUMER_SECRET,
    sandbox: config.SANDBOX,
    china: config.CHINA
  });

  client.getRequestToken(callbackUrl, function(error, oauthToken, oauthTokenSecret, results) {
    if (error) {
      req.session.error = JSON.stringify(error);
      res.redirect('/');
    } else {
      // store the tokens in the session
      req.session.oauthToken = oauthToken;
      req.session.oauthTokenSecret = oauthTokenSecret;

      // redirect the user to authorize the token
      res.redirect(client.getAuthorizeUrl(oauthToken));
    }
  });
};

// OAuth callback
exports.oauth_callback = function(req, res) {
  var client = new Evernote.Client({
    consumerKey: config.API_CONSUMER_KEY,
    consumerSecret: config.API_CONSUMER_SECRET,
    sandbox: config.SANDBOX,
    china: config.CHINA
  });

  client.getAccessToken(
    req.session.oauthToken,
    req.session.oauthTokenSecret,
    req.query.oauth_verifier,
    function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
      if (error) {
        console.log('error');
        console.log(error);
        res.redirect('/');
      } else {
        // store the access token in the session
        req.session.oauthAccessToken = oauthAccessToken;
        req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;
        req.session.edamShard = results.edam_shard;
        req.session.edamUserId = results.edam_userId;
        req.session.edamExpires = results.edam_expires;
        req.session.edamNoteStoreUrl = results.edam_noteStoreUrl;
        req.session.edamWebApiUrlPrefix = results.edam_webApiUrlPrefix;
        res.redirect('/');
      }
  });
};

// Clear session
exports.clear = function(req, res) {
  req.session.destroy();
  res.redirect('/');
};
