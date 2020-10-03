pipeline {
    agent any
    tools {nodejs "node"}

    stages {
        stage('install dependencies') {
            steps {
                sh 'npm install'
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
