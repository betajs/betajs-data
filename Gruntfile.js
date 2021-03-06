module.exports = function(grunt) {

	var pkg = grunt.file.readJSON('package.json');
	var gruntHelper = require('betajs-compile');
	var dist = 'betajs-data';

	gruntHelper.init(pkg, grunt)
	
	
    /* Compilation */    
	.scopedclosurerevisionTask(null, "src/**/*.js", "dist/" + dist + "-noscoped.js", {
		"module": "global:BetaJS.Data",
		"base": "global:BetaJS"
    }, {
    	"base:version": pkg.devDependencies.betajs
    })	
    .concatTask('concat-scoped', [require.resolve("betajs-scoped"), 'dist/' + dist + '-noscoped.js'], 'dist/' + dist + '.js')
    .uglifyTask('uglify-noscoped', 'dist/' + dist + '-noscoped.js', 'dist/' + dist + '-noscoped.min.js')
    .uglifyTask('uglify-scoped', 'dist/' + dist + '.js', 'dist/' + dist + '.min.js')
	.jsbeautifyTask("beautify1", "src/**/*.js")
	.jsbeautifyTask("beautify2", "src/**/**/*.js")

    /* Testing */
    .qunitjsTask(null, ['tests/qunitjs-node.js'])
    .closureTask(null, [require.resolve("betajs-scoped"), require.resolve("betajs"), "./dist/betajs-data-noscoped.js"])
    .browserstackTask(null, 'tests/tests.html', {desktop: true, mobile: true})
    .lintTask(null, ['./src/**/*.js', './Gruntfile.js', './tests/**/*.js', './benchmarks/**/*.js'])
    .benchmarkTask("benchmark-compare", ['benchmarks/common/init.js', 'benchmarks/compare/*.js'])
    
    /* External Configurations */
    .codeclimateTask()
    .travisTask(null, "4.0")
    .packageTask()
	.autoincreasepackageTask(null, "package-source.json")
	.githookTask(null, "pre-commit", "check")
    
    /* Markdown Files */
	.readmeTask()
    .licenseTask()
    
    /* Documentation */
    .docsTask();

	grunt.initConfig(gruntHelper.config);	

	grunt.registerTask('default', ['autoincreasepackage', 'package', 'readme', 'license', 'githook', 'codeclimate', 'travis', 'beautify1', 'beautify2', 'scopedclosurerevision', 'concat-scoped', 'uglify-noscoped', 'uglify-scoped']);
	grunt.registerTask('check', [ 'lint', 'qunitjs' ]);

};