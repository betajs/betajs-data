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

    /* Testing */
    .qunitTask(null, './dist/' + dist + '-noscoped.js',
    				 grunt.file.expand("./tests/*/*.js"),
    		         [require.resolve("betajs-scoped"), require.resolve("betajs")])
    .closureTask(null, [require.resolve("betajs-scoped"), require.resolve("betajs"), "./dist/betajs-data-noscoped.js"])
    .browserstackTask(null, 'tests/tests.html', {desktop: true, mobile: true})
    .lintTask(null, ['./src/**/*.js', './dist/' + dist + '-noscoped.js', './dist/' + dist + '.js', './Gruntfile.js', './tests/**/*.js', './benchmarks/**/*.js'])
    .benchmarkTask("benchmark-compare", ['benchmarks/common/init.js', 'benchmarks/compare/*.js'])
    
    /* External Configurations */
    .codeclimateTask()
    .travisTask(null, "0.11")
    .packageTask()
    
    /* Markdown Files */
	.readmeTask()
    .licenseTask()
    
    /* Documentation */
    .docsTask();

	grunt.initConfig(gruntHelper.config);	

	grunt.registerTask('default', ['package', 'readme', 'license', 'codeclimate', 'travis', 'scopedclosurerevision', 'concat-scoped', 'uglify-noscoped', 'uglify-scoped']);
	grunt.registerTask('check', [ 'lint', 'qunit' ]);

};