pipeline {
    agent any
    tools {nodejs "node"}

    stages {
        stage('install dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('lint website') {
            steps {
                sh "npx eslint website/src/"
            }
        }

        stage('lint server') {
            steps {
                sh "npx eslint -c server/.eslintrc.js server/bin/"
            }
        }

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
