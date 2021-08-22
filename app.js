const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const { Console } = require('console');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
	if (err) return console.log('Error loading client secret file:', err);
	// Authorize a client with credentials, then call the Google Sheets API.
	//authorize(JSON.parse(content), listMajors);
	authorize(JSON.parse(content), getDataFromSheets)
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
	const {client_secret, client_id, redirect_uris} = credentials.installed;
	const oAuth2Client = new google.auth.OAuth2(
		client_id, client_secret, redirect_uris[0]);

	// Check if we have previously stored a token.
	fs.readFile(TOKEN_PATH, (err, token) => {
		if (err) return getNewToken(oAuth2Client, callback);
		oAuth2Client.setCredentials(JSON.parse(token));
		callback(oAuth2Client);
	});
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
	const authUrl = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
	});
	console.log('Authorize this app by visiting this url:', authUrl);
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	rl.question('Enter the code from that page here: ', (code) => {
		rl.close();
		oAuth2Client.getToken(code, (err, token) => {
		if (err) return console.error('Error while trying to retrieve access token', err);
		oAuth2Client.setCredentials(token);
		// Store the token to disk for later program executions
		fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
			if (err) return console.error(err);
			console.log('Token stored to', TOKEN_PATH);
		});
		callback(oAuth2Client);
		});
	});
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listMajors(auth) {
	const sheets = google.sheets({version: 'v4', auth});
	sheets.spreadsheets.values.get({
		spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
		range: 'Class Data!A2:E',
	}, (err, res) => {
		if (err) return console.log('The API returned an error: ' + err);
		const rows = res.data.values;

		if (rows.length) {
			console.log('Name, Major:');
			// Print columns A and E, which correspond to indices 0 and 4.
			rows.map((row) => {
				console.log(`${row[0]}, ${row[4]}`);
			});
		} else {
			console.log('No data found.');
		}
	});
}

/**
 * Prints the ruokalista
 * 
 */

function getDataFromSheets(auth) {
	const sheets = google.sheets({version: 'v4', auth});
	var foods = [];
	var types = [];
	var content;

	try {
		content = JSON.parse(fs.readFileSync('sheets-id.json'));
		getFoodTypes(content.id, sheets, types, foods);
	} catch (error) {
		console.error('No sheets id file');
	}
}

function dataRetrieved(types, foods) {
	createOneWeekList(foods);
}

function createOneWeekList(foods) {
	var selectedFoods = [];

	while(selectedFoods.length < 7 && foods.length > 0) {

		var randomFood = foods[Math.floor(Math.random() * foods.length)];

		if (canSelectFood(selectedFoods, randomFood)) {
			selectedFoods.push(randomFood);
		}
		else {
			foods.splice(randomFood, 1);
		}
	}

	if (selectedFoods.length < 7) {
		console.log("Ei löydetty tarpeeksi ruokia. Sorry!");
	}
	else {
		console.log("\x1b[33m%s\x1b[0m", "Ensi viikon ruokalista:");
		console.log("\x1b[35m%s\x1b[0m", "Maanantai: " +selectedFoods[0].name);
		console.log("\x1b[35m%s\x1b[0m", "Tiistai: " +selectedFoods[1].name);
		console.log("\x1b[35m%s\x1b[0m", "Keskiviikko: " +selectedFoods[2].name);
		console.log("\x1b[35m%s\x1b[0m", "Torstai: " +selectedFoods[3].name);
		console.log("\x1b[35m%s\x1b[0m", "Perjantai: " +selectedFoods[4].name);
		console.log("\x1b[35m%s\x1b[0m", "Lauantai: " +selectedFoods[5].name);
		console.log("\x1b[35m%s\x1b[0m", "Sunnuntai: " +selectedFoods[6].name);
	}
}

function canSelectFood(selectedFoods, newFood) {
	var canBeSelected = true;

	newFood.types.forEach(newFoodType => {
		var count = 0;

		selectedFoods.forEach(selection => {
			selection.types.forEach(selectedType => {
				if (newFoodType.name == selectedType.name) {
					count++;
				}
			});
		});

		if (count >= newFoodType.max) canBeSelected = false;
	});

	return canBeSelected;
}

function getFoodTypes(id, sheets, types, foods) {
	sheets.spreadsheets.values.get({
		spreadsheetId: id,
		range: 'MaxViikossa!A2:B'
	}, (err, res) => {
		if (err) return console.log('The API returned an error: ' + err);

		const rows = res.data.values;

		if (rows.length) {
			rows.forEach(row => {
				types.push(new type(row[0], row[1]));
			});
		}
		else {
			console.log('No data found.');
		}

		getFoods(id, sheets, types, foods);
	});
}

function getFoods(id, sheets, types, foods) {
	sheets.spreadsheets.values.get({
		spreadsheetId: id,
		range: 'Ruokat!A2:B'
	}, (err, res) => {
		if (err) return console.log('The API returned an error: ' + err);

		const rows = res.data.values;

		if (rows.length) {
			rows.forEach(row => {
				var typeNames = row[1].match(/[a-zöä]+/ig);
				var typeArray = [];

				typeNames.forEach(typeName => {
					var myType = new type(typeName, 1);
					var typeIsNew = true;

					types.forEach(savedType => {

						
						if (typeName == savedType.name) {
							myType = savedType;
							typeIsNew = false;
						}
					});

					typeArray.push(myType);
					if (typeIsNew) types.push(myType);
				});

				foods.push(new food(row[0], typeArray));
			});

			
		}
		else {
			console.log('No data found.');
		}

		dataRetrieved(types, foods);
	});
}

class food {
	constructor (name, types) {
		this.name = name;
		this.types = types;
	}
}

class type {
	constructor (name, max) {
		this.name = name;
		this.max = parseInt(max);
	}
}