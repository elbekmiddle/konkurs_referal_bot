"use strict";

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

var cloudinary = require("cloudinary").v2; // Cloudinary konfiguratsiyasi

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

var CloudinaryService =
  /*#__PURE__*/
  (function () {
    function CloudinaryService() {
      _classCallCheck(this, CloudinaryService);
    }

    _createClass(CloudinaryService, null, [
      {
        key: "uploadImage",
        value: function uploadImage(imageUrl) {
          var folder,
            result,
            _args = arguments;
          return regeneratorRuntime.async(
            function uploadImage$(_context) {
              while (1) {
                switch ((_context.prev = _context.next)) {
                  case 0:
                    folder =
                      _args.length > 1 && _args[1] !== undefined
                        ? _args[1]
                        : "contest_images";
                    _context.prev = 1;
                    _context.next = 4;
                    return regeneratorRuntime.awrap(
                      cloudinary.uploader.upload(imageUrl, {
                        folder: folder,
                        quality: "auto",
                        fetch_format: "auto",
                      }),
                    );

                  case 4:
                    result = _context.sent;
                    return _context.abrupt("return", {
                      success: true,
                      url: result.secure_url,
                      public_id: result.public_id,
                    });

                  case 8:
                    _context.prev = 8;
                    _context.t0 = _context["catch"](1);
                    console.error("Cloudinary upload error:", _context.t0);
                    return _context.abrupt("return", {
                      success: false,
                      error: _context.t0.message,
                    });

                  case 12:
                  case "end":
                    return _context.stop();
                }
              }
            },
            null,
            null,
            [[1, 8]],
          );
        },
      },
      {
        key: "deleteImage",
        value: function deleteImage(publicId) {
          return regeneratorRuntime.async(
            function deleteImage$(_context2) {
              while (1) {
                switch ((_context2.prev = _context2.next)) {
                  case 0:
                    _context2.prev = 0;
                    _context2.next = 3;
                    return regeneratorRuntime.awrap(
                      cloudinary.uploader.destroy(publicId),
                    );

                  case 3:
                    return _context2.abrupt("return", {
                      success: true,
                    });

                  case 6:
                    _context2.prev = 6;
                    _context2.t0 = _context2["catch"](0);
                    console.error("Cloudinary delete error:", _context2.t0);
                    return _context2.abrupt("return", {
                      success: false,
                      error: _context2.t0.message,
                    });

                  case 10:
                  case "end":
                    return _context2.stop();
                }
              }
            },
            null,
            null,
            [[0, 6]],
          );
        },
      },
    ]);

    return CloudinaryService;
  })();

module.exports = CloudinaryService;
