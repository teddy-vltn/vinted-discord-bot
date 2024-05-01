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
            id: apiResponse.id,
            title: apiResponse.title,
            price: apiResponse.price,
            size_title: apiResponse.size_title,
            url: apiResponse.url,
            photo_url: apiResponse.photo.url,
            profile_url: apiResponse.user.profile_url,
            brand_title: apiResponse.brand_title,
            status: apiResponse.status,
            service_fee: apiResponse.service_fee

        });
    }
}

export default VintedItem;
