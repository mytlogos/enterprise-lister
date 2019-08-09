pipeline {
    agent any
    stages {
        stage('build') {
            steps {
                bat 'npm install"'
            }
        }
        stage('post-build'){
            when {
                 expression {
                     currentBuild.result == null || currentBuild.result == 'SUCCESS'
                 }
            }
            steps {
                 bat 'copy "%userprofile%\\env.env" env.env'
                 bat 'pm2 stop ecosystem.config.js"'
                 bat 'pm2 start ecosystem.config.js"'
            }
        }
    }
}
