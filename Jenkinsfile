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
            sh 'npx eslint website/src/'
          }
        }

        stage('lint server') {
          steps {
            sh '''npx eslint -c server/.eslintrc.js server/bin/
'''
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

  }
  tools {
    nodejs 'node'
  }
}