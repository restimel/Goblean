(function() {

const dbVersion = 1;
const dbName = 'goblean';
const tableGoblean = 'gobleans';

let DB = null;

/*
	To remove Db from browser:
	indexedDB.deleteDatabase(dbName)
*/

function upgradeDB(event) {
	DB = event.target.result;

	switch(event.oldVersion) {
		case 0:
			let objectStore = DB.createObjectStore(tableGoblean, {keyPath: 'code'});
			// objectStore.createIndex('index_code', 'code', {unique: true});
	}
}

function onVersionChange(event) {
	console.warn('indexedDB version has change in a newer tab. This page should be reloaded.');
	//DB.close();
}

function connectionSuccess(event) {
	if (!DB) {
		DB = event.target.result;
	}

	DB.onversionchange = onVersionChange;
}

function openDB() {
	let request = self.indexedDB.open(dbName, dbVersion);

	request.onerror = (event) => {
	    // mostly happen when user forbid indexedDB
	    console.error(event);
	};
	request.onupgradeneeded = upgradeDB;
	request.onsuccess  = connectionSuccess;
	request.onblocked  = (event) => {
		console.log('is running in another tab. Its version is deprecated and must be refresh');
	};
}

openDB();

const manageError = (error) => (event) => error(event.target.error);

self.store = {
	gobleans: {
		getAll: function() {
			return new Promise((success, error) => {
				const result = [];
				const request = DB
					.transaction([tableGoblean], 'readonly')
					.objectStore(tableGoblean) //how to sort
					.openCursor();
				request.onsuccess = function(event) {
					let cursor = event.target.result;

					if (cursor) {
						result.push(cursor.value);
						cursor.continue();
					} else {
						success(result);
					}
				};
				request.onerror = manageError(error);
			});
		},
		get: function(code) {
			return new Promise((success, error) => {
				const request = DB
					.transaction([tableGoblean], 'readonly')
					.objectStore(tableGoblean)
					.get(code);
				request.onsuccess = function(event) {
					success(event.target.result);
				};
				request.onerror = manageError(error);
			});
		},
		has: function(code) {
			return new Promise((success, error) => {
				const request = DB
					.transaction([tableGoblean], 'readonly')
					.objectStore(tableGoblean)
					.get(code);
				request.onsuccess = function(event) {
					success(typeof event.target.result !== 'undefined');
				};
				request.onerror = manageError(error);
			});
		},
		set: function(item) {
			return new Promise((success, error) => {
				const request = DB
					.transaction([tableGoblean], 'readwrite')
					.objectStore(tableGoblean)
					.add(item);
				request.onsuccess = function(event) {
					success(event.target.result);
				};
				request.onerror = manageError(error);
			});
		}
	}
};

})();

/* compatibility check */
(self.compatibility || {}).indexDB = true;