// worker for filtering table

self.addEventListener('message', function(e) {
    var keyword = e.data.keyword;
    var list = e.data.list;
    // Filter list table
    var res = [];
    for (var index = 0; index < list.length; index++) {
        songName = list[index].title;
        if (songName.toLowerCase().indexOf(keyword) > -1)
            res.push(index);
    }
    self.postMessage(res);
});

