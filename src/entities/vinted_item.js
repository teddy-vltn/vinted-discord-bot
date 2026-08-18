// Validation functions as standalone utilities
function validateId(value) {
    return (typeof value === 'number' && value > 0) ? value : 0;
  }
  
  function validateNumber(value) {
    return (typeof value === 'number') ? value : 0;
  }
  
  function validateString(value) {
    return (typeof value === 'string') ? value : "N/A";
  }
  
  function validateBoolean(value) {
    return (typeof value === 'boolean') ? value : false;
  }
  
  function validateUrl(value) {
    try {
      new URL(value);
      return value;
    } catch (error) {
      return "N/A";
    }
  }
  
  function parseDate(value) {
    const parsedDate = new Date(value);
    return isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate;
  }
  
  // Classes using external validation functions
  class VintedPhoto {
    constructor(photo) {
      this.id = validateId(photo.id);
      this.imageNo = validateNumber(photo.image_no);
      this.width = validateNumber(photo.width);
      this.height = validateNumber(photo.height);
      this.url = validateUrl(photo.url);
      this.dominantColor = validateString(photo.dominant_color);
      // The trimmed catalog response has no full_size_url, only url and thumbnails.
      this.fullSizeUrl = validateUrl(photo.full_size_url ?? photo.url);
    }
  }

  class VintedUser {
    constructor(userData) {
        this.id = validateId(userData.id);
        this.login = validateString(userData.login);
        this.feedback_reputation = validateNumber(userData.feedback_reputation)
        this.feedback_count = validateNumber(userData.feedback_count)
        // Today's Vinted sends the seller country neither in the catalog nor on the item page.
        this.countryCode = validateString(userData.country_code).toLowerCase();

        this.photo = userData.photo ? new VintedPhoto(userData.photo) : "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png"

        this.url = validateUrl(userData.profile_url);
    }
}
  
  class VintedItem {
    constructor(itemData) {
      this.id = validateId(itemData.id);
      this.title = validateString(itemData.title);
      this.url = validateUrl(itemData.url);
      this.brandId = validateId(itemData.brand_id);
      this.sizeId = validateId(itemData.size_id);
      this.statusId = validateId(itemData.status_id);
      this.userId = validateId(itemData.user_id ?? itemData.user?.id);

      if (itemData.item_attributes?.length > 0 && itemData.item_attributes[0].code === "video_game_platform") {
        this.videoGamePlatformId = validateId(itemData.item_attributes[0].ids?.[0]);
      }

      this.countryId = validateId(itemData.country_id);
      this.catalogId = validateId(itemData.catalog_id);

      this.description = validateString(itemData.description);
      // Today's catalog returns size_title and brand_title instead of size and brand;
      // the old fields stay as a fallback in case the API shape changes again.
      this.size = validateString(itemData.size ?? itemData.size_title);
      this.brand = validateString(itemData.brand ?? itemData.brand_title);
      this.composition = validateString(itemData.composition);
      this.status = validateString(itemData.status);
      this.label = validateString(itemData.label);
      // The price now arrives as an object { amount, currency_code }, previously as two fields.
      this.currency = validateString(itemData.currency ?? itemData.price?.currency_code);
      this.priceNumeric = validateNumber(parseFloat(itemData.price_numeric ?? itemData.price?.amount));

      this.updatedAtTs = parseDate(itemData.updated_at_ts);
      this.colorId = validateId(itemData.color1_id);

      // <t:${Math.floor(Date.now() / 1000)}:R>
      this.unixUpdatedAt = Math.floor(this.updatedAtTs.getTime() / 1000); 
      this.unixUpdatedAtString = `<t:${this.unixUpdatedAt}:R>`;
  
      // Create photo objects
      // The catalog returns a photos array, some items carry a single photo in the photo field.
      const photos = itemData.photos ?? (itemData.photo ? [itemData.photo] : []);
      this.photos = photos.map(photo => new VintedPhoto(photo));

      // Create user object
      this.user = itemData.user ? new VintedUser(itemData.user) : null;

      this.catalogBranchTitle = validateString(itemData.catalog_branch_title);
    }

    /**
     * Fills in fields that the catalog response no longer carries.
     * @param {Object} detail - Detail from fetchItemDetail.
     * @returns {VintedItem} - The same instance, for chaining.
     */
    mergeDetail(detail) {
      if (!detail) {
        return this;
      }

      if (typeof detail.description === 'string') {
        this.description = detail.description;
      }
      if (typeof detail.brandId === 'number') {
        this.brandId = detail.brandId;
      }
      if (typeof detail.catalogId === 'number') {
        this.catalogId = detail.catalogId;
      }
      if (this.user && typeof detail.feedbackReputation === 'number') {
        this.user.feedback_reputation = detail.feedbackReputation;
      }
      if (this.user && typeof detail.feedbackCount === 'number') {
        this.user.feedback_count = detail.feedbackCount;
      }

      return this;
    }

    getNumericStars() {
      return this.user ? this.user.feedback_reputation : 0;
    }

    getDominantColor() {
      if (this.photos.length === 0) {
        return "#000000";
      }
      return this.photos[0].dominantColor;
    }
  }
  
  export { VintedItem, VintedPhoto };
