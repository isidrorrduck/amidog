const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

const GRADLE_DISTRIBUTION_URL =
  "https\\://services.gradle.org/distributions/gradle-8.13-bin.zip";

function setGradleDistributionUrl(contents) {
  const property = `distributionUrl=${GRADLE_DISTRIBUTION_URL}`;

  if (contents.match(/^distributionUrl=.*$/m)) {
    return contents.replace(/^distributionUrl=.*$/m, property);
  }

  return contents.endsWith("\n") ? `${contents}${property}\n` : `${contents}\n${property}\n`;
}

module.exports = function withGradle813(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const wrapperPropertiesPath = path.join(
        config.modRequest.platformProjectRoot,
        "gradle",
        "wrapper",
        "gradle-wrapper.properties",
      );

      if (!fs.existsSync(wrapperPropertiesPath)) {
        throw new Error(`Gradle wrapper properties not found: ${wrapperPropertiesPath}`);
      }

      const contents = fs.readFileSync(wrapperPropertiesPath, "utf8");
      const nextContents = setGradleDistributionUrl(contents);

      if (nextContents !== contents) {
        fs.writeFileSync(wrapperPropertiesPath, nextContents);
      }

      return config;
    },
  ]);
};
