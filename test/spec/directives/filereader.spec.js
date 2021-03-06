goog.require('ngeo.misc.filereaderComponent');

describe('ngeo.misc.filereaderComponent', () => {
  let element, rootScope;

  beforeEach(() => {
    element = angular.element(
      '<input type="file" ngeo-filereader="fileContent" />');

    module(($provide) => {
      const FileReader = function() {};
      FileReader.prototype.readAsText = function(file) {
        const progressEvent = {
          target: {
            result: '<kml></kml>'
          }
        };
        this.onload(progressEvent);
      };
      $provide.value('$window', {FileReader: FileReader, angular: window.angular});
    });

    angular.mock.inject(($rootScope, $compile) => {
      $compile(element)($rootScope);
      rootScope = $rootScope;
    });
  });

  it('sets the file content onto the scope', () => {
    const input = element[0];
    const customEvent = document.createEvent('CustomEvent');
    customEvent.initCustomEvent('change', true, true, {});
    input.dispatchEvent(customEvent);
    expect(rootScope.fileContent).toBe('<kml></kml>');
  });
});
