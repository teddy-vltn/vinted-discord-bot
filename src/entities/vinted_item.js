class VintedItem {
    constructor({ id, title, price, size_title, url, photo_url, profile_url, brand_title, status, service_fee }) {
        this.id = id;
        this.title = title;
        this.price = price;
        this.size = size_title;
        this.url = url;
        this.imageUrl = photo_url;
        this.profileUrl = profile_url;
        this.brand = brand_title;
        this.status = status;
        this.serviceFee = service_fee;
    }

    static fromApiResponse(apiResponse) {
        return new VintedItem({
            id: apiResponse.id || "N/A",
            title: apiResponse.title || "N/A",
            price: apiResponse.price || "N/A",
            size_title: apiResponse.size_title || "N/A",
            url: apiResponse.url || "N/A",
            photo_url: apiResponse.photo.url || "https://www.vinted.it/assets/no-photo/medium-8d7f",
            profile_url: apiResponse.user.profile_url || "https://www.vinted.it/member/12345678",
            brand_title: apiResponse.brand_title || "N/A",
            status: apiResponse.status || "N/A",
            service_fee: apiResponse.service_fee || "N/A"
        });
    }
}

export default VintedItem;
