const Promise = require('bluebird');
const path = require('path');

const { actions, fs, log, selectors, util } = require('vortex-api');

const BMS_SCRIPT = path.join(__dirname, 'rev_pak_unpack.bms');
const INVAL_SCRIPT = path.join(__dirname, 'rev_pak_invalidate.bms');
const REVAL_SCRIPT = path.join(__dirname, 'rev_pak_revalidate.bms');
const ORIGINAL_FILE_LIST = path.join(__dirname, 'rev_pak_names_release.list');

const NATIVES_DIR = 'natives' + path.sep;
const STEAM_DLL = 'steam_api64.dll';
const GAME_PAK_FILE = 're_chunk_000.pak';
const GAME_ID = 'residentevilvillage';
const STEAM_ID = 'dunno yet';

function findGame() {
  return undefined;
  // return util.steam.findByAppId(STEAM_ID.toString())
  //   .then(game => game.gamePath);
}

function prepareForModding(discovery, api) {
  if (api.ext.addReEngineGame === undefined) {
    return Promise.reject(new Error('re-engine-wrapper dependency is not loaded!'));
  }
  return new Promise((resolve, reject) => {
    api.ext.addReEngineGame({
      gameMode: GAME_ID,
      bmsScriptPaths: {
        invalidation: INVAL_SCRIPT,
        revalidation: REVAL_SCRIPT,
        extract: BMS_SCRIPT,
      },
      fileListPath: ORIGINAL_FILE_LIST,
    }, err => (err === undefined)
      ? resolve()
      : reject(err));
  }).then(() => fs.ensureDirWritableAsync(path.join(discovery.path, 'natives')));
}

function testSupportedContent(files, gameId) {
  // Make sure we're able to support this mod.
  const supported = (gameId === GAME_ID)
    && (files.find(file => file.indexOf(NATIVES_DIR) !== -1) !== undefined);
  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

async function installContent(files,
                              destinationPath,
                              gameId,
                              progressDelegate) {
  const rootPath = files.find(file => file.endsWith(NATIVES_DIR));
  const idx = rootPath.length - NATIVES_DIR.length;
  // Remove directories and anything that isn't in the rootPath.
  let filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1)
      && (!file.endsWith(path.sep))));

  filtered = filtered.map(file => {
    return {
      source: file,
      destination: file.substr(idx),
    };
  });

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file.source,
      destination: file.destination.toLowerCase(),
    }
  });

  return Promise.resolve({ instructions });
}

function main(context) {
  context.requireExtension('re-engine-wrapper');
  context.registerGame({
    id: GAME_ID,
    name: 'Resident Evil: Village',
    compatible: { usvfs: false },
    logo: 'REVillageGameArt.jpg',
    mergeMods: true,
    queryPath: findGame,
    queryModPath: () => '.',
    executable: () => 're8demo.exe',
    requiredFiles: ['re8demo.exe', GAME_PAK_FILE],
    //requiresLauncher,
    environment: {
      SteamAPPId: STEAM_ID.toString(),
    },
    setup: (discovery) => prepareForModding(discovery, context.api),
  });

  context.registerInstaller('revqbmsmod', 25, testSupportedContent, installContent);
}

module.exports = {
  default: main
};