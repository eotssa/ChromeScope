module.exports = function(grunt) {

  grunt.initConfig({
    retire: {
      js: ["path/to/your/js/files/**/*.js"], // specify your JS files here
      node: ["."], // scan node project (package.json)
      options: {
        verbose: true,
        packageOnly: false, // scan both package.json and actual JS files
        jsRepository: "https://raw.github.com/RetireJS/retire.js/master/repository/jsrepository.json",
        nodeRepository: "https://raw.github.com/RetireJS/retire.js/master/repository/npmrepository.json",
        outputFile: "./retire-output.json"
      }
    }
  });

  grunt.loadNpmTasks("grunt-retire");
};
