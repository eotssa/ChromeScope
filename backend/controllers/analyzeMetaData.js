function analyzeManifest(manifest) {
  let score = 0;

  if (!manifest.developer || !manifest.developer.email) score += 1;

  if (!manifest.privacy_policy) score += 1;

  if (!manifest.homepage_url) score += 1;

  return score;
}

module.exports = analyzeManifest;