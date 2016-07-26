import Nightmare from 'nightmare';
import faker from 'faker';
import mailbox from 'node-guerrilla';
import fetch from 'node-fetch'

function pad(n, width, z = '0') {
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function rand(min, max, n = 1) {
  const rand = Math.floor(Math.random() * (max - min + 1)) + min;
  return pad(rand, n);
}

const ACCOUNT_LANGUAGE = 'fr';
const PROXY_COUNTRY = 'FR';
const GUERRILLAMAIL_HOST = 'sharklasers.com';
const API_ENDPOINT = 'https://club.pokemon.com/us/pokemon-trainer-club/sign-up/';
const MAILFETCH_ATTEMPTS = 200;

export default async function (newConfig = {}) {
  faker.locale = ACCOUNT_LANGUAGE;
  const identity = faker.helpers.createCard();
  const emailAccount = await mailbox.get_email();

  const username = `${identity['username'].replace(/\./g, '')}${rand(0, 9999)}`;
  const email = `${emailAccount.alias}@${GUERRILLAMAIL_HOST}`;

  console.log('Generating identity...')

  let config = {
    email,
    username,
    password: `P${username}`,
    date_of_birdth: `${rand(1975, 2000, 4)}-${rand(1, 12, 2)}-${rand(1, 30, 2)}`,
    ...newConfig,
    emailAccount,
  };

  console.log(config);

  console.log('Retrieving proxy...');

  const proxy = await fetch(`http://gimmeproxy.com/api/getProxy?` +
    `get=true&post=true&cookies=true&referer=true&supportsHttps=true&` +
    `user-agent=true&protocol=http&anonymityLevel=1&country=${PROXY_COUNTRY}`)
    .then(r => r.json());

  console.log('Found proxy:', proxy.curl);

  console.log('PLC Account creation...');

  const NIGHTMARE_CONFIG = {
    show: true,
    switches: {
      'proxy-server': `http=${proxy.ipPort}`,
      'ignore-certificate-errors': true,
    },
  };

  await new Nightmare(NIGHTMARE_CONFIG)
    .goto(API_ENDPOINT)
    .wait('form[name="verify-age"]')
    .evaluate(function (config) {
      $('#id_dob').removeAttr('readonly');
      $('#id_dob').val(config['date_of_birdth']);
    }, config)
    .click('input[type=submit].continue-button')
    .wait('form[name="create-account"]')
    .type('#id_username', config['username'])
    .type('#id_password', config['password'])
    .type('#id_confirm_password', config['password'])
    .type('#id_email', config['email'])
    .type('#id_confirm_email', config['email'])
    .type('#id_public_profile_opt_in_1', 'False')
    .check('#id_terms')
    .click('input[type=submit].button-green')
    .wait('.verify-signup')
    .end();

  console.log('Waiting for email confirmation...');

  const confirmUrl = await mailbox.get_link_poll('Pok&eacute;mon_Trainer_Club_Activation',
    'Verify your email', config.emailAccount.sid_token, -MAILFETCH_ATTEMPTS+6);

  console.log('Email received! =>', confirmUrl);

  await new Nightmare(NIGHTMARE_CONFIG)
    .goto(confirmUrl)
    .wait('.activate-success')
    .end();

  console.log('Account succefully activated!');
  return config;
}
