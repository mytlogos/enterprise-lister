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
      // deploy from master only
      when {
        branch 'master'
      }
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
        // execute a remote script which does all the necessary deploy steps
        // TODO: put the script in git
        sshCommand remote: remote, command: './update-enterprise.sh'
      }
    }
  }
  tools {
    nodejs 'node'
  }
}