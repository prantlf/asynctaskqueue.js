//     asynctaskqueue.js 2.0.1
//     https://github.com/prantlf/asynctaskqueue.js
//     (c) 2014-2019 Ferdinand Prantl <prantlf@gmail.com>
//     Freely distributable under the MIT license

// ## Environment Detection

// Immediate fuction which gathers dependencies, calls the implementation
// factory and exposes the `AsyncTaskQueue` object according to the
// JavaScript environment.  Underscore.js is required for the ECMAScript5
// compatibility in older web browsers and JQuery is required for the
// support of (deferred) promises.
(function (window, _, jQuery, factory) {

  // Variables to support non-conflicting loading in the web browser.
  var OldAsyncTaskQueue, AsyncTaskQueue;

  // Register the Queue object in the AMD environment, depending
  // on Underscore.js and jQuery.
  if (typeof define !== "undefined") {
    define("asynctaskqueue", [ "underscore", "jquery" ], function (_, $) {
      // Return the Queue object as the module export.
      return factory(_, $);
    });

  // Detect a CommonJS module and ask for Underscore.js and jQuery.
  } else if (typeof module !== "undefined" &&
             typeof module.exports !== "undefined") {
    _ = require("underscore");
    jQuery = require("jquery");
    // Expose the Queue object as the only module export.
    module.exports = factory(_, jQuery);

  // Detect the web browser and check that Underscore.js and jQuery were
  // included before ths script.
  } else if (typeof window !== "undefined") {
    if (typeof _ === "undefined") {
      throw new Error("Underscore.js not detected.")
    }
    if (typeof jQuery === "undefined") {
      throw new Error("JQuery not detected.")
    }
    // Expose the Queue object globally and give the user a chance to restore
    // the global namespace by calling the noConflict function.
    OldAsyncTaskQueue = window.AsyncTaskQueue;
    window.AsyncTaskQueue = AsyncTaskQueue = factory(_, jQuery);

    // ### Non-conflicting Integration

    // Restores the global value of `AsyncTaskQueue` which existed before
    // this script was loaded and returns the `AsyncTaskQueue` exported by
    // this script so that it can be stored in a local variable.
    AsyncTaskQueue.noConflict = function () {
      window.AsyncTaskQueue = OldAsyncTaskQueue;
      return AsyncTaskQueue;
    }

  // No way to expose the public objects without knowing where we are.
  } else {
    throw new Error("JavaScript environment not recognized.")
  }

// ## Module Implementation

// Passes dependencies from the global environment and the factory function
// encapsulating the `AsyncTaskQueue` implementation to the immediate
// initialization function.
}(window, _, jQuery, function (_, $) {

  // ### Task Wrapper

  // Represents a pending task in the queue.
  //
  // The _worker_ is a (function) callback to execute, which must return
  // a promise and reject it with an Error or just throw in case of a
  // failure.
  // The _options_ is an optional parameter passed to `Queue.enqueue`.
  function Task(worker, options) {
    this.worker = worker;
    this.deferred = $.Deferred();
  }

  _.extend(Task.prototype, {

    // Returns a promise for the result of the task worker.
    // When the task is scheduled for execution, the promise `progress` is
    // triggered with `{ scheduled: true }`.  Other states are relayed from
    // the promise returned by the worker.
    promise: function () {
      return this.deferred.promise();
    }

  });

  // ### Task Scheduler

  // Provides a FIFO queue scheduler pushing and popping pending tasks.
  //
  // The _options_ is an optional parameter passed to `Queue.constructor`.
  function Scheduler(options) {}

  _.extend(Scheduler.prototype, {

    // Pushes the task to the end of the array to be picked as the last one.
    push: function (tasks, task) {
      tasks.push(task);
    },

    // Pops the (oldest) task from the beginning of the array and returns it.
    // Returns `undefined` if the array is empty.
    pop: function (tasks) {
      return tasks.shift();
    }

  });

  // ### Task Queue

  // Provides a queue executing tasks.
  //
  // The _options_ is an object with the following properties:
  // * parallelism  - number of tasks run in parallel (`Infinity` by default)
  // * asynchronous - boolean to schedule the task execution at the next
  //   VM context switch (`false` by default)
  // * Task         - object to wrap the workers with (`Task` by default)
  // * Scheduler    - object to push pending workers to the queue and pop
  //   them for execution later (`Scheduler` by default)
  // * scheduler    - the optional parameter to be passed to the
  //   `Scheduler.constructor`
  function Queue(options) {
    options || (options = {});
    this.parallelism = options.parallelism || Infinity;
    this.asynchronous = options.asynchronous;
    if (options.Task) {
      this.Task = options.Task;
    }
    if (options.Scheduler) {
      this.Scheduler = options.Scheduler;
    }
    this.pending = [];
    this.processing = [];
    this.deferred = $.Deferred();
    this.scheduler = new Scheduler(this, options.scheduler);
  }

  _.extend(Queue.prototype, {

    // Wraps the worker functions passed to `enqueue` to be manageable.
    Task: Task,

    // Decides how the tasks are pushed to the pending array and in which
    // order they are popped for execution.
    Scheduler: Scheduler,

    // #### Public Methods

    // Adds a task to the queue.
    //
    // The _task_ is a `Task` object or a (function) callback returning a
    // promise to be wrapped by a `Task` instance.
    // The _options_ is an optional parameter to be passed to the
    // `Task.constructor`.
    //
    // Returns the `Task` object added to the queue.
    enqueue: function (task, options) {
      if (!(task instanceof this.Task)) {
        task = new this.Task(task, options);
      }
      this.scheduler.push(this.pending, task);
      this._schedule();
      return task;
    },

    // Removes a task from the queue if it is still pending.
    //
    // The _task_ is a `Task` object or a (function) callback added to the
    // queue earlier.
    //
    // Returns the `Task` object removed from the queue or `undefined`
    // if no matching one was found.
    dequeue: function (task) {
      var index = this._index(this.pending, task);
      if (index >= 0) {
        return this.pending.splice(index, 1)[0];
      }
    },

    // Returns a promise for watching the queue state.  A progress
    // notification is triggered when a task is scheduled for execution.
    // The promise is resolved when all tasks have been resolved or rejected.
    // When it happens, the underlying `deferred` object is replaced with a
    // new one to serve another queue execution.  Subscribers must re-attach
    // to the new the promise again if they want to be notified about the
    // other queue execution.
    promise: function () {
      return this.deferred.promise();
    },

    // Returns if the queue has no tasks in pending and processing queues.
    empty: function () {
      return !(this.pending.length || this.processing.length);
    },

    // Pauses scheduling of pending tasks for execution; currently executing
    // tasks will still continue running.
    //
    // Returns this instance for call chaining.
    pause: function () {
      this.paused = true;
      return this;
    },

    // Resumes scheduling of pending tasks for execution.
    //
    // Returns this instance for call chaining.
    resume: function () {
      this.paused = false;
      // When a task execution finishes, another one is scheduled.  But the
      // pause could be so long that all tasks have been long finished.
      this._schedule();
      return this;
    },

    // Clears the pending tasks in the queue; already executing tasks will
    // continue running.
    //
    // Returns a promise to be resolved when the executing tasks have
    // finished and the queue has become empty.  *Warning:* the queue promise
    // cannot not be used for checking for the abortion status if the queue
    // has been already empty; it wait for another queue run.
    abort: function () {
      this.pending = [];
      return this.processing.length ? this.promise() :
        $.Deferred.resolve().promise();
    },

    // #### Private Methods

    // Schedules another task for executing if the queue is not paused
    // and the maximum degree of parallelism has not been reached yet.
    _schedule: function () {
      var task;
      if (!this.paused &&
          this.processing.length < this.parallelism &&
          (task = this.scheduler.pop(this.pending))) {
        this.processing.push(task);
        this.deferred.notify({ scheduled: true });
        this._execute(task);
        // Do not wait until the task execution has finished; the queue may
        // be configured to allow parallel task execution.
        this._schedule();
      }
    },

    // Calls the worker function of the task and relays its promise.
    _execute: function (task) {
      var self = this;
      // Extracted to a local function to be callable by various ways.
      function work() {
        try {
          task.worker()
            .progress(task.deferred.notify)
            .done(task.deferred.done)
            .fail(task.deferred.fail)
            .always(function () {
              self._finish(task);
            });
        // Tasks should singnal error through their promise, but if they meet
        // a fatal failure, the queue execution should not freeze.
        } catch (error) {
          task.deferred.reject(error);
          self._finish(task);
        }
      }
      if (this.asynchronous) {
        // `setTimeout(..., 0)` makes the callback wait 4 ms before it can be
        // executed but `setImmediate` is not available in most web browsers.
        if (typeof setImmediate !== "undefined") {
          setImmediate(work);
        } else {
          setTimeout(work, 0);
        }
      } else {
        // If the workers do asynchronous operations like HTTP requests, the
        // extra asynchronous worker execution may not be necessary.
        work();
      }
    },

    // Called when a task finished its execution to update the queue state.
    _finish: function (task) {
      // Remove the task from the processing array; it will leave the queue.
      var index = this._index(this.processing, task);
      this.processing.splice(index, 1);
      // When new tasks are added after the queue was emptied, it is
      // considered a new queue execution; the once notified watchers should
      // not be informed again. Once signalled promise cannot be reset either.
      if (this.empty()) {
        this.deferred.resolve();
        this.deferred = $.Deferred();
      } else {
        // If more tasks than the allowed degree of parallelism have been
        // added to the queue, schedule anoher one now.
        this._schedule();
      }
    },

    // Returns the index of the task in the specified array or -1 if no
    // matching one was found.  It accepts both `Task` objects and worker
    // functions to identify the task.
    _index: function (tasks, task) {
      var i;
      if (task instanceof this.Task) {
        task = task.worker;
      }
      for (i = 0; i < tasks.length; ++i) {
        if (tasks[i].worker === task) {
          return i;
        }
      }
      return -1;
    }

  });

  Queue.version = "1.0.0";

  return Queue;

}));

