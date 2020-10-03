pipeline {
    agent any
    stages {
        stage('build') {
            steps {
                sh "printenv"
                sh 'npm install'
                sh 'npm run build'
            }
        }
    }
}
