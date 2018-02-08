goog.require('ngeo.print.Utils');

describe('ngeo.print.Utils', () => {

  let ngeoPrintUtilsService;
  let inchesPerMeter, dotsPerInch;

  beforeEach(() => {
    angular.mock.inject((ngeoPrintUtils) => {
      ngeoPrintUtilsService = ngeoPrintUtils;
    });
    inchesPerMeter = ngeo.print.Utils.INCHES_PER_METER_;
    dotsPerInch = ngeo.print.Utils.DOTS_PER_INCH_;
  });

  afterEach(() => {
    ngeo.print.Utils.INCHES_PER_METER_ = inchesPerMeter;
    ngeo.print.Utils.DOTS_PER_INCH_ = dotsPerInch;
  });

  describe('#getOptimalResolution', () => {
    it('returns the optimal resolution', () => {
      // consider 3200 dots per meter
      ngeo.print.Utils.INCHES_PER_METER_ = 40;
      ngeo.print.Utils.DOTS_PER_INCH_ = 80;
      const mapSize = [2, 1];  // px
      const printMapSize = [640, 320];  // dots
      const printScale = 10;  // scale denominator
      const optimalResolution = ngeoPrintUtilsService.getOptimalResolution(
        mapSize, printMapSize, printScale);
      expect(optimalResolution).toBe(1);
    });
  });
});
