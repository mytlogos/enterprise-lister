pipeline {
  agent any
  stages {
    stage('install dependencies') {
      steps {
        sh 'npm install'
      }
    }

    stage('lint') {
      parallel {
        stage('lint website') {
          steps {
            sh 'npm run lint:website'
          }
        }

        stage('lint server') {
          steps {
            sh 'npm run lint:server'
          }
        }

      }
    }

    stage('build') {
      parallel {
        stage('build website') {
          steps {
            sh 'npm run build:website'
          }
        }

        stage('build server') {
          steps {
            sh 'npm run build:server'
          }
        }

      }
    }

    stage('release') {
      environment {
        GH_TOKEN = credentials('e2d21e2c-c919-4137-9355-21e4602a862e')
      }
      steps {
        // package the dist directory in a tar
        sh 'tar -cvf dist.tar dist/'
        // release new version and publish the tars on github
        sh 'npx semantic-release'
      }
    }
  }
  tools {
    nodejs 'node'
  }
}