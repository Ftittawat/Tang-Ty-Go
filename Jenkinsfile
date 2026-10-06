pipeline {
    agent any

    parameters {
        string(
            name: 'GIT_TAG',
            defaultValue: '',
            description: 'Git tag ที่จะ build และ deploy (เช่น v1.0.0)'
        )
    }

    environment {
        IMAGE_NAME = 'tangty-go'
        // Jenkins > Credentials > Secret text (prefixed so it can't clash with other projects).
        APP_PASSWORD = credentials('TANGTY_GO_APP_PASSWORD')
    }

    stages {
        stage('Validate') {
            steps {
                script {
                    if (!params.GIT_TAG?.trim()) {
                        error('❌ กรุณาระบุ GIT_TAG เช่น v1.0.0')
                    }
                }
            }
        }

        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: "refs/tags/${params.GIT_TAG}"]],
                    userRemoteConfigs: scm.userRemoteConfigs,
                    extensions: [[$class: 'CleanBeforeCheckout']]
                ])
            }
        }

        stage('Build Image') {
            steps {
                sh """
                    docker build \
                        -t ${IMAGE_NAME}:${params.GIT_TAG} \
                        -t ${IMAGE_NAME}:latest \
                        .
                """
            }
        }

        stage('Deploy') {
            steps {
                sh "docker compose up -d --force-recreate"
            }
        }

        stage('Verify') {
            steps {
                sleep(time: 15, unit: 'SECONDS')
                sh "docker inspect --format='{{.State.Status}}' tangty-go | grep -q running"
                // Web apps only:
                sh "docker exec tangty-go wget -q --spider http://127.0.0.1:3200/login"
            }
        }

        stage('Cleanup') {
            steps {
                // ลบ dangling images (untagged) เพื่อประหยัด disk
                sh "docker image prune -f"
            }
        }
    }

    post {
        success {
            echo "✅ tangty-go ${params.GIT_TAG} deployed สำเร็จ!"
        }
        failure {
            echo "❌ Deploy ล้มเหลว กรุณาตรวจสอบ logs"
            sh "docker logs tangty-go --tail=50 || true"
        }
    }
}
