/* Gaia is a static doorway. Typed text never leaves this tab. */
(function (root) {
  'use strict';

  const VERSION = '0.10.8';
  const CATEGORIES = Object.freeze({comprehension: 'Comprendre', connection: 'Relier', integration: 'Améliorer'});
  const SYMBOLS = Object.freeze({comprehension: 'α', connection: '∿', integration: '↗'});

  function instanceURL(value) {
    const raw = typeof value === 'string' ? value.trim() : '';
    const error = 'Saisis uniquement l’adresse HTTPS de ton Tao, sans chemin, identifiant, paramètre ni fragment.';
    if (!raw || /[\s\\\u0000-\u001f\u007f]/.test(raw) || !/^https?:\/\/[^/?#]+\/?$/i.test(raw)) throw new Error(error);
    let url;
    try { url = new URL(raw); } catch (_) { throw new Error(error); }
    if (url.username || url.password || raw.includes('@') || raw.includes('?') || raw.includes('#') || (url.pathname && url.pathname !== '/')) throw new Error(error);
    if (url.protocol === 'http:') {
      // Check the entered authority as well: URL normalizes numeric IP aliases.
      const authority = raw.slice(raw.indexOf('://') + 3).split('/')[0];
      if (!/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(authority)) throw new Error('HTTP est accepté seulement pour localhost ou 127.0.0.1, sur l’appareil qui héberge Tao. Utilise HTTPS pour une installation distante.');
    } else if (url.protocol !== 'https:') throw new Error(error);
    if (!url.hostname) throw new Error(error);
    return url.origin;
  }

  function localAsset(value) {
    if (typeof value !== 'string' || !/^(?:\.\/)?[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value)) return null;
    const path = value.replace(/^\.\//, '');
    if (path.split('/').some(part => !part || part === '.' || part === '..')) return null;
    return './' + path;
  }

  function releaseView(config, manifest, desktopManifest) {
    const preview = {version: VERSION, signed: false, reason: 'La qualification publique et la signature de cette version restent à confirmer. L’installateur est indisponible.', installer: null, desktopInstaller: null, source: null, signature: null, desktopSignature: null};
    if (!config || !manifest || config.version !== VERSION || manifest.version !== VERSION || !manifest.files || typeof manifest.files !== 'object') return preview;
    function artifact(record, records) {
      if (!record || typeof record.name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(record.name)) return null;
      const href = localAsset(record.url);
      const metadata = records[record.name];
      if (!href || href.split('/').pop() !== record.name || !metadata || !/^[a-f0-9]{64}$/.test(metadata.sha256) || !Number.isSafeInteger(metadata.size) || metadata.size <= 0) return null;
      return {name: record.name, href, sha256: metadata.sha256, size: metadata.size};
    }
    function signatureView(value, expectedManifest, expectedSignature, expectedMetadata) {
      if (!exactKeys(value, ['manifest', 'signature', 'metadata', 'public_key', 'public_key_sha256'])) return null;
      if (localAsset(value.manifest) !== './' + expectedManifest || localAsset(value.signature) !== './' + expectedSignature || localAsset(value.metadata) !== './' + expectedMetadata || localAsset(value.public_key) !== './release-public.pem' || !/^[a-f0-9]{64}$/.test(value.public_key_sha256)) return null;
      return {href: './' + expectedSignature, publicKeySha256: value.public_key_sha256};
    }
    const source = artifact(config.source_archive, manifest.files);
    const installer = artifact(config.installer, manifest.files);
    const signature = config.signature;
    const mainProof = signature && signatureView(signature, 'release.json', 'release.sig', 'signing.json');
    const signed = config.download_status === 'signed' && Boolean(installer && mainProof);
    let desktopInstaller = null, desktopProof = null;
    if (signed && desktopManifest && exactKeys(desktopManifest, ['schema', 'version', 'release_manifest_sha256', 'package']) && desktopManifest.schema === 'tao.desktop.release.v1' && desktopManifest.version === VERSION && /^[a-f0-9]{64}$/.test(desktopManifest.release_manifest_sha256)) {
      const packageRecord = desktopManifest.package;
      const expectedName = 'Tao_Linux_' + VERSION + '_all.deb';
      const packageValid = exactKeys(packageRecord, ['name', 'sha256', 'size', 'architecture', 'supported', 'install_mode']) && packageRecord.name === expectedName && packageRecord.architecture === 'all' && sameList(packageRecord.supported, ['debian', 'ubuntu']) && packageRecord.install_mode === 'graphical_or_package_manager';
      if (packageValid) {
        desktopInstaller = artifact(config.desktop_installer, {[expectedName]: packageRecord});
        desktopProof = signatureView(config.desktop_signature, 'desktop-release.json', 'desktop-release.sig', 'desktop-signing.json');
        if (!desktopInstaller || !desktopProof || desktopProof.publicKeySha256 !== mainProof.publicKeySha256) { desktopInstaller = null; desktopProof = null; }
      }
    }
    const reason = typeof config.reason === 'string' && config.reason.length <= 1600 && config.reason.trim() ? config.reason.trim() : preview.reason;
    return {version: VERSION, signed, reason, installer: signed ? installer : null, desktopInstaller, source, signature: signed ? mainProof.href : null, desktopSignature: desktopProof ? desktopProof.href : null};
  }

  function plain(value, max) { return typeof value === 'string' && value.trim().length > 0 && value.length <= max; }
  function textList(value) { return Array.isArray(value) && value.length > 0 && value.length <= 30 && value.every(item => plain(item, 4000)); }
  function exactKeys(value, keys) {
    return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
  }
  function sameList(value, expected) { return Array.isArray(value) && value.length === expected.length && value.every((item, index) => item === expected[index]); }

  function readBirthContract(data) {
    const rootKeys = ['schema', 'status', 'subject', 'seed', 'inheritance', 'birth', 'adaptation', 'permissions', 'executable'];
    const loop = ['persist', 'observe', 'compare', 'residual', 'vary', 'test', 'retain_or_rollback'];
    const included = ['runtime', 'default_genome', 'reflexes', 'development_kit', 'builtin_heritage', 'canonical_theory'];
    const excluded = ['identity', 'private_memory', 'conversations', 'credentials', 'permissions', 'provider_configuration'];
    if (!exactKeys(data, rootKeys) || data.schema !== 'tao.gaia.birth.v1' || data.status !== 'public_inert_contract' || data.subject !== 'new_sovereign_tao' || data.executable !== false) throw new Error('Contrat public de naissance non reconnu.');
    if (!exactKeys(data.seed, ['observer_model', 'specialized_centers', 'basal_loop']) || data.seed.observer_model !== 'C0' || !sameList(data.seed.specialized_centers, []) || !sameList(data.seed.basal_loop, loop)) throw new Error('Graine publique non reconnue.');
    if (!exactKeys(data.inheritance, ['included', 'optional', 'excluded']) || !sameList(data.inheritance.included, included) || !sameList(data.inheritance.optional, ['explicitly_selected_inert_methods']) || !sameList(data.inheritance.excluded, excluded)) throw new Error('Héritage public non reconnu.');
    if (!exactKeys(data.birth, ['location', 'identity', 'story_authority', 'activation']) || data.birth.location !== 'owner_selected_machine' || data.birth.identity !== 'fresh_local' || data.birth.story_authority !== 'human' || data.birth.activation !== 'manual') throw new Error('Conditions de naissance non reconnues.');
    if (!exactKeys(data.adaptation, ['machine_observation', 'reasoner', 'reasoner_required', 'automatic_ai_calls', 'first_center']) || data.adaptation.machine_observation !== 'local_explicit' || data.adaptation.reasoner !== 'owner_selected' || data.adaptation.reasoner_required !== false || data.adaptation.automatic_ai_calls !== false || data.adaptation.first_center !== 'only_after_reproducible_residual_and_explicit_owner_decision') throw new Error('Contrat d’adaptation non reconnu.');
    if (!exactKeys(data.permissions, ['read', 'execution']) || data.permissions.read !== 'none' || data.permissions.execution !== 'not_granted') throw new Error('Une naissance publique ne transmet aucune permission.');
    return {
      schema: data.schema,
      seed: {observerModel: 'C0', specializedCenters: 0, basalLoop: loop.slice()},
      inheritance: {included: included.slice(), optional: data.inheritance.optional.slice(), excluded: excluded.slice()},
      birth: {location: data.birth.location, identity: data.birth.identity, storyAuthority: data.birth.story_authority, activation: data.birth.activation},
      adaptation: {machineObservation: data.adaptation.machine_observation, reasoner: data.adaptation.reasoner, reasonerRequired: false, automaticAICalls: false, firstCenter: data.adaptation.first_center},
      permissions: {read: 'none', execution: 'not_granted'}, executable: false
    };
  }

  function readCatalogue(data) {
    if (!data || data.schema_version !== 1 || !plain(data.catalogue_id, 120) || !plain(data.catalogue_version, 30) || data.status !== 'curated_initial_guidance' || !Array.isArray(data.entries) || data.entries.length > 100) throw new Error('Catalogue non reconnu.');
    const ids = new Set();
    const entries = data.entries.map(entry => {
      if (!entry || !plain(entry.id, 100) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id) || ids.has(entry.id) || !plain(entry.version, 30) || !Object.prototype.hasOwnProperty.call(CATEGORIES, entry.category) || !plain(entry.title, 240) || !plain(entry.summary, 3000) || !plain(entry.counterexample, 4000) || !['applicability', 'limits', 'steps', 'expected_evidence'].every(key => textList(entry[key])) || entry.status !== 'curated_initial_guidance' || entry.executable !== false || !entry.permissions || entry.permissions.read !== 'none' || entry.permissions.execution !== 'not_granted' || !entry.origin || entry.origin.kind !== 'local_maintainer' || entry.origin.source !== 'tao_repository' || !plain(entry.origin.note, 4000)) throw new Error('Une fiche du catalogue n’est pas reconnue.');
      ids.add(entry.id);
      // Copy the public schema only. Unknown fields cannot enter a downloaded file.
      return {id: entry.id, version: entry.version, category: entry.category, title: entry.title, summary: entry.summary, applicability: entry.applicability.slice(), limits: entry.limits.slice(), steps: entry.steps.slice(), expected_evidence: entry.expected_evidence.slice(), counterexample: entry.counterexample, permissions: {read: 'none', execution: 'not_granted'}, origin: {kind: 'local_maintainer', source: 'tao_repository', note: entry.origin.note}, status: 'curated_initial_guidance', executable: false};
    });
    return {schema_version: 1, catalogue_id: data.catalogue_id, catalogue_version: data.catalogue_version, entries};
  }

  function searchText(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr'); }
  function filterEntries(entries, category, query) {
    const needle = searchText(String(query || '').trim());
    return entries.filter(entry => (category === 'all' || category === entry.category) && searchText([entry.title, entry.summary, ...entry.applicability].join(' ')).includes(needle));
  }
  function exportEntry(catalogue, id) {
    const entry = catalogue.entries.find(item => item.id === id);
    if (!entry) throw new Error('Choisis une fiche disponible.');
    return {schema_version: 1, catalogue_id: catalogue.catalogue_id, catalogue_version: catalogue.catalogue_version, entry};
  }
  function prepareQuestion(value) {
    const intention = typeof value === 'string' ? value.trim() : '';
    if (!intention || intention.length > 4000) throw new Error('Écris quelques mots sur ce que tu aimerais rendre possible.');
    return 'Voici mon intention de départ pour mon Tao local :\n' + intention +
      '\n\nPars du seed C0 : ne crée aucun centre spécialisé par défaut. Utilise seulement les capacités de la machine explicitement présentées dans cette conversation ; ne suppose aucun accès.' +
      '\nCherche d’abord un résidu reproductible lié à une histoire. S’il n’y en a pas, conserve la demande comme non intégrée et ne propose aucun centre.' +
      '\nS’il y en a un, propose au plus un premier centre sous la forme entrée x → processus f → sortie f(x), avec sa raison, ses limites, la plus petite expérience utile, la preuve attendue et le coût de complexité.' +
      '\nN’installe rien, ne lis aucun secret, ne connecte aucun compte et n’exécute aucune action sans ma validation explicite.';
  }
  function connectionQuestion(device, value) {
    const address = value.trim() ? instanceURL(value) : null;
    return 'Je souhaite retrouver mon Tao depuis ' + device + '.\n' + (address ? 'L’adresse de mon installation est : ' + address + '.\n' : 'Je ne connais pas encore l’adresse accessible de mon installation.\n') + 'Aide-moi à vérifier où Tao fonctionne, les moyens de connexion réellement disponibles et les étapes adaptées à mon appareil. Distingue le pilotage depuis un navigateur de l’exécution sur un Linux autorisé.\nPrésente les actions et les accès nécessaires avant que je décide. Ne me demande pas de copier de mot de passe, de jeton ou de code secret dans cette question.';
  }

  function element(document, tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function renderCard(document, entry, onOpen) {
    const card = element(document, 'article', undefined, 'contribution-card');
    const top = element(document, 'div', undefined, 'card-top');
    top.append(element(document, 'span', CATEGORIES[entry.category]), element(document, 'span', SYMBOLS[entry.category], 'card-symbol'));
    top.lastChild.setAttribute('aria-hidden', 'true');
    const button = element(document, 'button', 'Lire la méthode ↗', 'text-button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Lire la méthode : ' + entry.title);
    button.addEventListener('click', () => onOpen(entry));
    card.append(top, element(document, 'h3', entry.title), element(document, 'p', entry.summary), button);
    return card;
  }
  function renderDetail(document, entry) {
    const fragment = document.createDocumentFragment();
    const title = element(document, 'h2', entry.title); title.id = 'detail-title';
    fragment.append(title, element(document, 'p', entry.summary), element(document, 'p', 'Guide initial du mainteneur · Version ' + entry.version + ' · Aucun droit d’exécution', 'detail-status'));
    const sections = [['Pour quelle situation', 'applicability', 'ul'], ['Les étapes proposées', 'steps', 'ol'], ['Comment juger le résultat', 'expected_evidence', 'ul'], ['Les limites à garder en vue', 'limits', 'ul']];
    sections.forEach(([label, key, tag]) => {
      const list = element(document, tag);
      entry[key].forEach(text => list.append(element(document, 'li', text)));
      fragment.append(element(document, 'h3', label), list);
    });
    fragment.append(element(document, 'h3', 'Un contre-exemple'), element(document, 'p', entry.counterexample), element(document, 'h3', 'D’où vient cette méthode'), element(document, 'p', entry.origin.note));
    return fragment;
  }

  async function publicJSON(url) {
    const response = await root.fetch(url, {credentials: 'omit', mode: 'same-origin', referrerPolicy: 'no-referrer', cache: 'no-store', redirect: 'error'});
    if (!response.ok) throw new Error('Fichier public indisponible.');
    const text = await response.text();
    if (text.length > 1000000) throw new Error('Fichier public trop volumineux.');
    return JSON.parse(text);
  }

  function init(document) {
    const byId = id => document.getElementById(id);
    let catalogue = null, category = 'all', selected = null;
    let release = releaseView(null, null);
    const dialog = byId('contribution-dialog');

    async function copy(text, status, field) {
      try {
        if (!root.navigator.clipboard || !root.isSecureContext) throw new Error('Copie manuelle nécessaire.');
        await root.navigator.clipboard.writeText(text);
        status.textContent = 'Question copiée. Tu peux la relire et la coller dans ton Tao.';
      } catch (_) {
        if (field) { field.focus(); field.select(); }
        status.textContent = 'La copie automatique n’est pas disponible ici. Sélectionne le texte et copie-le avec ton appareil.';
      }
    }
    byId('question-form').addEventListener('submit', event => {
      event.preventDefault();
      try {
        byId('draft-text').textContent = prepareQuestion(byId('intention').value);
        byId('draft-result').hidden = false;
        byId('draft-status').textContent = 'Question préparée dans cet onglet. Rien n’a été envoyé à une IA.';
      } catch (error) { byId('intention').setCustomValidity(error.message); byId('intention').reportValidity(); }
    });
    byId('intention').addEventListener('input', () => byId('intention').setCustomValidity(''));
    byId('copy-draft').addEventListener('click', () => copy(byId('draft-text').textContent, byId('draft-status')));

    function showPlatform() {
      const platform = byId('platform').value;
      const panel = byId('platform-guidance');
      panel.replaceChildren();
      const text = platform === 'linux' ? 'Sur Debian ou Ubuntu, installe Tao 0.10.8 comme une application. Sur un autre Linux, l’installateur universel reste disponible. Python 3.9 ou plus est nécessaire.' : platform ? 'Tu peux piloter un Tao accessible depuis le navigateur de cet appareil. Le moteur d’exécution local est fourni pour Linux uniquement ; aucun installateur natif n’est livré pour ce système.' : 'Choisis ton système pour voir le chemin disponible. Tu peux changer ce choix à tout moment.';
      panel.append(element(document, 'p', text));
      if (platform && platform !== 'linux') {
        const link = element(document, 'a', 'Retrouver une installation existante ↗', 'text-button'); link.href = '#retrouver'; panel.append(link);
      }
      byId('linux-downloads').hidden = platform !== 'linux';
    }
    byId('platform').addEventListener('change', showPlatform);
    function showRelease() {
      byId('release-state').textContent = release.signed ? 'Signature publiée · Tao ' + release.version : 'Aperçu · Installateur indisponible';
      byId('release-state').classList.toggle('signed', release.signed);
      byId('release-reason').textContent = release.reason;
      byId('release-version').textContent = 'Tao ' + release.version;
      [['desktop-installer-link', release.desktopInstaller], ['installer-link', release.installer], ['source-link', release.source]].forEach(([id, asset]) => {
        const link = byId(id); link.hidden = !asset;
        if (asset) { link.href = asset.href; link.download = asset.name; } else link.removeAttribute('href');
      });
      byId('installer-blocked').hidden = release.signed;
      byId('desktop-install-instructions').hidden = !release.desktopInstaller;
      byId('install-instructions').hidden = !release.installer;
      if (release.installer) byId('install-command').textContent = 'python3 ' + release.installer.name;
      byId('signature-link').hidden = !release.signature;
      if (release.signature) byId('signature-link').href = release.signature;
      byId('desktop-signature-link').hidden = !release.desktopSignature;
      if (release.desktopSignature) byId('desktop-signature-link').href = release.desktopSignature;
      const desktopIntegrity = release.desktopInstaller ? ' Paquet Debian/Ubuntu : ' + release.desktopInstaller.sha256 + '.' : '';
      byId('artifact-integrity').textContent = release.source ? 'Sources proposées pour lecture et revue. Empreinte SHA-256 : ' + release.source.sha256 + '.' + desktopIntegrity + ' ' + (release.signed ? 'La publication annonce une signature ; ce navigateur ne la vérifie pas cryptographiquement.' : 'Ces sources ne sont pas présentées comme une version signée.') : 'Aucune archive qualifiée n’est proposée par cette page pour le moment.';
      showPlatform();
    }
    Promise.all([publicJSON('./portal.json'), publicJSON('./release.json')]).then(([config, manifest]) => {
      const desktop = config && config.desktop_installer ? publicJSON('./desktop-release.json').catch(() => null) : Promise.resolve(null);
      return desktop.then(desktopManifest => { release = releaseView(config, manifest, desktopManifest); showRelease(); });
    }).catch(() => { showRelease(); byId('release-reason').textContent = 'Les informations de version sont indisponibles. Aucun installateur ne peut être proposé pour le moment.'; });
    publicJSON('./birth.json').then(data => {
      const contract = readBirthContract(data);
      byId('birth-contract-state').textContent = 'Contrat public reconnu : ' + contract.seed.observerModel + ', aucun centre spécialisé, activation manuelle et aucun appel IA automatique.';
      const link = byId('birth-contract-link'); link.href = './birth.json'; link.download = 'gaia-birth.json'; link.hidden = false;
    }).catch(() => {
      byId('birth-contract-state').textContent = 'Le contrat public de naissance est indisponible ou non reconnu. Aucun héritage ne doit être déduit de cette page.';
      byId('birth-contract-link').hidden = true;
    });

    function readAddress() {
      const field = byId('tao-url');
      try {
        const address = instanceURL(field.value);
        field.removeAttribute('aria-invalid'); byId('url-error').hidden = true;
        return address;
      } catch (error) {
        field.setAttribute('aria-invalid', 'true'); byId('url-error').textContent = error.message; byId('url-error').hidden = false; field.focus();
        return null;
      }
    }
    byId('tao-url').addEventListener('input', () => { byId('tao-url').removeAttribute('aria-invalid'); byId('url-error').hidden = true; byId('open-status').textContent = ''; });
    byId('return-form').addEventListener('submit', event => {
      event.preventDefault();
      const address = readAddress();
      if (!address) return;
      root.open(address, '_blank', 'noopener,noreferrer');
      byId('open-status').textContent = 'Ouverture demandée dans un nouvel onglet : ' + address + '. Aucun accès n’est autorisé par ce geste.';
    });
    byId('prepare-help').addEventListener('click', () => {
      const raw = byId('tao-url').value;
      if (raw.trim() && !readAddress()) return;
      byId('help-question').value = connectionQuestion(byId('help-device').value, raw);
      byId('help-result').hidden = false;
      byId('help-status').textContent = 'Question préparée ici. Elle n’a pas été envoyée.';
    });
    byId('copy-help').addEventListener('click', () => copy(byId('help-question').value, byId('help-status'), byId('help-question')));

    function openEntry(entry) {
      selected = entry.id;
      byId('detail-content').replaceChildren(renderDetail(document, entry));
      dialog.showModal();
    }
    function showCatalogue() {
      if (!catalogue) return;
      const visible = filterEntries(catalogue.entries, category, byId('catalogue-search').value);
      byId('catalogue-list').replaceChildren(...visible.map(entry => renderCard(document, entry, openEntry)));
      byId('catalogue-status').textContent = visible.length ? visible.length + (visible.length === 1 ? ' méthode à explorer.' : ' méthodes à explorer.') : 'Aucune méthode pour cette recherche. Essaie un autre mot ou un autre filtre.';
    }
    document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
      category = button.dataset.category;
      document.querySelectorAll('[data-category]').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
      showCatalogue();
    }));
    byId('catalogue-search').addEventListener('input', showCatalogue);
    byId('close-detail').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    byId('download-contribution').addEventListener('click', () => {
      if (!catalogue || !selected) return;
      const payload = exportEntry(catalogue, selected);
      const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], {type: 'application/json;charset=utf-8'});
      const href = URL.createObjectURL(blob);
      const link = element(document, 'a'); link.href = href; link.download = 'gaia-' + selected + '.json';
      document.body.append(link); link.click(); link.remove();
      root.setTimeout(() => URL.revokeObjectURL(href), 1000);
    });
    publicJSON('./catalogue.json').then(data => { catalogue = readCatalogue(data); showCatalogue(); }).catch(() => {
      byId('catalogue-list').replaceChildren();
      byId('catalogue-status').textContent = 'Les contributions sont indisponibles pour le moment. Recharge la page pour réessayer.';
    });
  }

  const api = Object.freeze({VERSION, instanceURL, localAsset, releaseView, readBirthContract, readCatalogue, filterEntries, exportEntry, prepareQuestion, connectionQuestion, renderCard, renderDetail, init});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.document) { root.GaiaPortal = api; init(root.document); }
})(typeof window !== 'undefined' ? window : globalThis);
