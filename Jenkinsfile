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

    stage("Deploy production") {
      environment {
        GH_TOKEN = credentials('e2d21e2c-c919-4137-9355-21e4602a862e')
      }
      steps {
        script {
          remote = [:]
          remote.name = env.ENTERPRISE_HOSTNAME
          remote.host = env.ENTERPRISE_SERVER
          remote.allowAnyHosts = true

          withCredentials([usernamePassword(credentialsId: '966e5fa4-833f-4477-a3b4-26327116d3f5', passwordVariable: 'ssh_pw', usernameVariable: 'ssh_user')]) {
              remote.user = ssh_user
              remote.password = ssh_pw
          }
        }
        sshCommand remote: remote, command: 'cd $ENTERPRISE_DIR'
        sshCommand remote: remote, command: 'git pull'
        // do not install depencies listed under devDependecies
        sshCommand remote: remote, command: 'npm install --production'
        // download the latest dist directory
        sshCommand remote: remote, command: 'node src/server/bin/update.js'
        // restart pm2 managed process
        sshCommand remote: remote, command: 'pm2 restart ecosystem.config.js'
      }
    }
  }
  tools {
    nodejs 'node'
  }
}