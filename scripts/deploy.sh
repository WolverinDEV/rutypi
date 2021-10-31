cat > ~/.npmrc << EOF
msvs_version=2017
//registry.npmjs.org/:_authToken=${npm_auth_token}
registry=http://registry.npmjs.org/
maxsockets=5
EOF

cd dist || exit 1
npm publish