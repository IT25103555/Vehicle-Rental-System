package com.ui.ai_recommendation.dto.request;

public class PricePredictionRequest {
    private String vehicleId;   // Mongo ObjectId as string - the Python service looks the vehicle up itself
    private Integer rentalDays;

    public String getVehicleId() { return vehicleId; }
    public void setVehicleId(String vehicleId) { this.vehicleId = vehicleId; }
    public Integer getRentalDays() { return rentalDays; }
    public void setRentalDays(Integer rentalDays) { this.rentalDays = rentalDays; }
}
