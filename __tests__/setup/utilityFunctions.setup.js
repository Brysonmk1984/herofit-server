function doneAfterTimeout(done, timeout = 1000) {
  setTimeout(() => done(), timeout);
}

module.exports = { doneAfterTimeout };
