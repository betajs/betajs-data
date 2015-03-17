module.banner = '/*!\n<%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\nCopyright (c) <%= pkg.contributors %>\n<%= pkg.license %> Software License.\n*/\n';

module.exports = function(grunt) {

	grunt
			.initConfig({
				pkg : grunt.file.readJSON('package.json'),
				'revision-count' : {
					options : {
						property : 'revisioncount',
						ref : 'HEAD'
					}
				},
				concat : {
					options : {
						banner : module.banner
					},
					dist_raw : {
						dest : 'dist/beta-data-raw.js',
						src : [ 'src/fragments/begin.js-fragment',
								'src/data/queries/*.js',
								'src/data/stores/*.js',
								'src/data/indices/*.js',
								'src/data/legacy/*.js', 'src/modelling/*.js',
								'src/modelling/associations/*.js',
								'src/modelling/validations/*.js',
								'src/fragments/end.js-fragment' ]
					},
					dist_scoped : {
						dest : 'dist/beta-data.js',
						src : [ 'vendors/scoped.js',
								'dist/beta-data-noscoped.js' ]
					}
				},
				preprocess : {
					options : {
						context : {
							MAJOR_VERSION : '<%= revisioncount %>',
							MINOR_VERSION : (new Date()).getTime()
						}
					},
					dist : {
						src : 'dist/beta-data-raw.js',
						dest : 'dist/beta-data-noscoped.js'
					}
				},
				clean : [ "dist/beta-data-raw.js", "dist/beta-data-closure.js" ],
				uglify : {
					options : {
						banner : module.banner
					},
					dist : {
						files : {
							'dist/beta-data-noscoped.min.js' : [ 'dist/beta-data-noscoped.js' ],
							'dist/beta-data.min.js' : [ 'dist/beta-data.js' ],
						}
					}
				},
				shell : {
					qunit : {
						command : 'qunit -c BetaJS:./compile/qunit-require.js -t ./tests/*/*',
						options : {
							stdout : true,
							stderr : true,
						},
						src : [ "src/*/*.js", "tests/*/*.js" ]
					},
					lint : {
						command : "jsl +recurse --process ./src/*.js",
						options : {
							stdout : true,
							stderr : true,
						},
						src : [ "src/*/*.js" ]
					},
					lintfinal : {
						command : "jsl --process ./dist/beta-data.js",
						options : {
							stdout : true,
							stderr : true,
						},
						src : [ "src/*/*.js" ]
					}
				},
				closureCompiler : {
					options : {
						compilerFile : process.env.CLOSURE_PATH
								+ "/compiler.jar",
						compilerOpts : {
							compilation_level : 'ADVANCED_OPTIMIZATIONS',
							warning_level : 'verbose',
							externs : [ "./src/fragments/closure.js-fragment" ]
						}
					},
					dist : {
						src : ["./vendors/beta.js", "./dist/beta-data-noscoped.js"],
						dest : "./dist/beta-data-closure.js"
					}
				},
				wget : {
					dependencies : {
						options : {
							overwrite : true
						},
						files : {
							"./vendors/scoped.js" : "https://raw.githubusercontent.com/betajs/betajs-scoped/master/dist/scoped.js",
							"./vendors/beta.js" : "https://raw.githubusercontent.com/betajs/betajs/master/dist/beta.js",
						}
					}
				},
			});

	grunt.loadNpmTasks('grunt-newer');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-shell');
	grunt.loadNpmTasks('grunt-git-revision-count');
	grunt.loadNpmTasks('grunt-preprocess');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-wget');
	grunt.loadNpmTasks('grunt-closure-tools');

	grunt.registerTask('default', [ 'revision-count', 'concat:dist_raw',
			'preprocess', 'clean', 'concat:dist_scoped', 'uglify' ]);
	grunt.registerTask('qunit', [ 'shell:qunit' ]);
	grunt.registerTask('lint', [ 'shell:lint', 'shell:lintfinal' ]);
	grunt.registerTask('check', [ 'lint', 'qunit' ]);
	grunt.registerTask('dependencies', [ 'wget:dependencies' ]);
	grunt.registerTask('closure', [ 'closureCompiler', 'clean' ]);

};