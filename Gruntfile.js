module.banner = '/*!\n<%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\nCopyright (c) <%= pkg.contributors %>\n<%= pkg.license %> Software License.\n*/\n';

module.exports = function(grunt) {

	grunt.initConfig({
		pkg : grunt.file.readJSON('package.json'),
		concat : {
			options : {
				banner : module.banner
			},
			dist : {
				dest : 'dist/beta-data.js',
				src : [
					'src/data/queries/queries.js', 
					'src/data/queries/constrained_queries.js', 
					'src/data/queries/query_model.js', 
					'src/data/queries/query_collection.js',
					'src/data/stores/base_store.js',
					'src/data/stores/assoc_store.js',
					'src/data/stores/memory_store.js',
					'src/data/stores/dumb_store.js',
					'src/data/stores/assoc_dumb_store.js',
					'src/data/stores/local_store.js',
					'src/data/stores/dual_store.js',
					'src/data/stores/cached_stores.js',
					'src/data/stores/conversion_store.js',
					'src/data/stores/passthrough_store.js',
					'src/data/stores/socket_stores.js',
					'src/data/stores/remote_store.js',
					'src/data/support/stores_monitor.js',
					'src/data/support/store_history.js',
					'src/modelling/exceptions.js',
					'src/modelling/properties.js',
					'src/modelling/models.js',
					'src/modelling/tables.js',
					'src/modelling/associations/associations.js', 
					'src/modelling/associations/table_associations.js', 
					'src/modelling/associations/has_many_associations.js', 
					'src/modelling/associations/has_many_through_array_associations.js', 
					'src/modelling/associations/has_one_associations.js', 
					'src/modelling/associations/belongs_to_associations.js', 
					'src/modelling/associations/conditional_associations.js', 
					'src/modelling/associations/polymorphic_has_one_associations.js', 
					'src/modelling/validations/validators.js', 
					'src/modelling/validations/present_validators.js', 
					'src/modelling/validations/email_validators.js', 
					'src/modelling/validations/length_validators.js', 
					'src/modelling/validations/unique_validators.js', 
					'src/modelling/validations/conditional_validators.js', 
				]
			},
		},
		uglify : {
			options : {
				banner : module.banner
			},
			dist : {
				files : {
					'dist/beta-data.min.js' : [ 'dist/beta-data.js' ],
				}
			}
		},
		shell: {
			qunit: {
		    	command: 'qunit -c BetaJS:./src/compile/qunit-require.js -t ./tests/*/*',
		    	options: {
                	stdout: true,
                	stderr: true,
            	},
            	src: [
            		"src/*/*.js",
            		"tests/*/*.js"
            	]
			},
			lint: {
		    	command: "jsl +recurse --process ./src/*.js",
		    	options: {
                	stdout: true,
                	stderr: true,
            	},
            	src: [
            		"src/*/*.js"
            	]
			}
		},
	});

	grunt.loadNpmTasks('grunt-newer');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-shell');	

	grunt.registerTask('default', ['newer:concat', 'newer:uglify']);
	grunt.registerTask('qunit', ['shell:qunit']);
	grunt.registerTask('lint', ['shell:lint']);	
	grunt.registerTask('check', ['lint', 'qunit']);

};