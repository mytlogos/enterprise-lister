pipeline {
    agent any
    stages {
        stage('build') {
            steps {
                sh 'npm install'
            }
        }
        stage('post-build'){
            when {
                 expression {
                     currentBuild.result == null || currentBuild.result == 'SUCCESS'
                 }
            }
            steps {
                 sh 'cp ~\\enterprise\\env.env env.env'
                 sh 'pm2 stop ecosystem.config.js"'
                 sh 'pm2 start ecosystem.config.js"'
            }
        }
    }
}
