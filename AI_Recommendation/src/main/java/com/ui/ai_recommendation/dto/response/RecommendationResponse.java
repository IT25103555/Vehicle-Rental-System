package com.ui.ai_recommendation.dto.response;

public class RecommendationResponse {

    private String vehicleId;
    private String name;
    private String brand;
    private String model;
    private String category;
    private Double rentalRatePerDay;
    private Double matchScore;

    public String getVehicleId() { return vehicleId; }
    public void setVehicleId(String vehicleId) { this.vehicleId = vehicleId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Double getRentalRatePerDay() { return rentalRatePerDay; }
    public void setRentalRatePerDay(Double rentalRatePerDay) { this.rentalRatePerDay = rentalRatePerDay; }

    public Double getMatchScore() { return matchScore; }
    public void setMatchScore(Double matchScore) { this.matchScore = matchScore; }
}
