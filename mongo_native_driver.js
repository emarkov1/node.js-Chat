var mongoClient = require('mongodb').MongoClient,
    format = require('util').format;

mongoClient.connect('mongodb://127.0.0.1:27017/chat', function (err, db) {
    if (err) throw  err;

    //подключаем коллекцию
    var collection = db.collection('test_insert');

    //удаляем из коллекции
    collection.remove({}, function (err, affected) {

        if (err) throw err;

        // вставляем новый документы
        collection.insert({a: 2}, function (err, docs) {
            collection.count(function (err, count) {
                console.log(format("count = %s", count));
            });

            //находим все записи
            var cursor = collection.find({a: 2});

            cursor.toArray(function (err, results) {
                console.dir(results);

                //Let's close db
                db.close();
            });
        });
    });
});