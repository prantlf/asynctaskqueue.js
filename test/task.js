(function() {

  var Task = AsyncTaskQueue.prototype.Task;

  module('Task');

  test('constructor', function() {
    var worker = function () {},
        task = new Task(worker);
    strictEqual(task.worker, worker, "worker should be stored");
  });

  test('promise', function() {
    var task = new Task(function () {}),
        promise = task.promise();
    equal(promise.state(), "pending", "promise should be pending initially");
    task.deferred.resolve();
    equal(promise.state(), "resolved", "earlier promise should be resolved");
    equal(task.promise().state(), "resolved", "new promise should be resolved");
  });

})();
