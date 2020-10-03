pipeline {
    agent any
    tools {nodejs "node"}

    stages {
        stage('install dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('build') {
            steps {
                sh 'npm run build'
            }
        }
    }
}
