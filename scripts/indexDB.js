(function() {

const dbVersion = 1;
const dbName = 'goblean';
const tableGoblean = 'gobleans';

let DB = null;
const DBReady = (() => {
	var cb = {};
	var p = new Promise((success, error) => {
		cb.success = success;
		cb.error = error;
	});

	return Object.assign(p, cb);
})();

/*
	To remove Db from browser:
	indexedDB.deleteDatabase(dbName)
*/

function upgradeDB(event) {
	DB = event.target.result;

	switch(event.oldVersion) {
		case 0:
			let objectStore = DB.createObjectStore(tableGoblean, {keyPath: 'code'});
			objectStore.createIndex('index_code', 'code', {unique: true});
			objectStore.createIndex('index_nbw', 'nbw', {unique: false});
			objectStore.createIndex('index_create', 'create', {unique: false});
			objectStore.createIndex('index_update', 'update', {unique: false});
			objectStore.createIndex('index_name', 'name', {unique: true});
	}
}

function onVersionChange(event) {
	console.warn('indexedDB version has change in a newer tab. This page should be reloaded.');
	//DB.close();
	DBReady.error(event);
}

function connectionSuccess(event) {
	if (!DB) {
		DB = event.target.result;
	}
	DBReady.success(DB);

	DB.onversionchange = onVersionChange;
}

function openDB() {
	let request = self.indexedDB.open(dbName, dbVersion);

	request.onerror = (event) => {
	    // mostly happen when user forbid indexedDB
	    console.error(event);
	    DBReady.error(event);
	};
	request.onupgradeneeded = upgradeDB;
	request.onsuccess  = connectionSuccess;
	request.onblocked  = (event) => {
		console.log('is running in another tab. Its version is deprecated and must be refresh');
		DBReady.error(DB);
	};
}

openDB();

const manageError = (error) => (event) => error(event.target.error);

self.store = {
	gobleans: {
		// getAll: function(index = 'nbw', ascOrder = false) {
		// 	return new Promise(async (success, error) => {
		// 		const DB = await DBReady;
		// 		const result = [];
		// 		const request = DB
		// 			.transaction([tableGoblean], 'readonly')
		// 			.objectStore(tableGoblean) //how to sort
		// 			.index('index_' + index)
		// 			.openCursor(null, ascOrder ? 'next' : 'prev');
		// 		request.onsuccess = function(event) {
		// 			let cursor = event.target.result;

		// 			if (cursor) {
		// 				result.push(cursor.value);
		// 				cursor.continue();
		// 			} else {
		// 				success(result);
		// 			}
		// 		};
		// 		request.onerror = manageError(error);
		// 	});
		// },
		getAll: function(index = 'code', ascOrder = true) {
			return new Promise(async (success, error) => {
				const DB = await DBReady;
				const request = DB
					.transaction([tableGoblean], 'readonly')
					.objectStore(tableGoblean) //how to sort
					.index('index_' + index)
					.getAll();
				request.onsuccess = function(event) {
					success(ascOrder ? event.target.result : event.target.result.reverse());
				};
				request.onerror = manageError(error);
			});
		},
		get: function(code) {
			return new Promise(async (success, error) => {
				const DB = await DBReady;
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
			return new Promise(async (success, error) => {
				const DB = await DBReady;
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
		delete: function(code) {
			return new Promise(async (success, error) => {
				const DB = await DBReady;
				const request = DB
					.transaction([tableGoblean], 'readwrite')
					.objectStore(tableGoblean)
					.delete(code);
				request.onsuccess = function(event) {
					success(event.target.result);
				};
				request.onerror = manageError(error);
			});
		},
		set: function(item) {
			return new Promise(async (success, error) => {
				if (!item.code) {
					console.log(item)
					error('no code for this goblean');
				}
				const oldItem = await this.has(item.code);

				if (!oldItem) {
					item.create = Date.now();
				}
				item.update = Date.now();

				const DB = await DBReady;
				const request = DB
					.transaction([tableGoblean], 'readwrite')
					.objectStore(tableGoblean)
					.put(item);
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