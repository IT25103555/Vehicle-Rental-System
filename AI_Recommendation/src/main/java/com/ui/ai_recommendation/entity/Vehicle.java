package com.ui.ai_recommendation.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

// Mirrors the Node team's Vehicle.js Mongoose schema exactly - same collection, same field names.
@Document(collection = "vehicles")
public class Vehicle {

    @Id
    private String id;

    private String name;
    private String registrationNo;
    private String category;          // Car, Van, SUV, Bike, Lorry, Bus
    private String brand;
    private String model;
    private Integer year;
    private String fuelType;          // Petrol, Diesel, Hybrid, Electric
    private String transmission;      // Manual, Automatic
    private Integer seats;
    private Double rentalRatePerDay;
    private Double ratePerKm;
    private String location;
    private String description;
    private List<String> images;
    private String status;            // Available, Reserved, Rented, Under Maintenance, Unavailable
    private Double averageRating;
    private Integer totalReviews;
    private Boolean isDeleted;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRegistrationNo() { return registrationNo; }
    public void setRegistrationNo(String registrationNo) { this.registrationNo = registrationNo; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public String getFuelType() { return fuelType; }
    public void setFuelType(String fuelType) { this.fuelType = fuelType; }

    public String getTransmission() { return transmission; }
    public void setTransmission(String transmission) { this.transmission = transmission; }

    public Integer getSeats() { return seats; }
    public void setSeats(Integer seats) { this.seats = seats; }

    public Double getRentalRatePerDay() { return rentalRatePerDay; }
    public void setRentalRatePerDay(Double rentalRatePerDay) { this.rentalRatePerDay = rentalRatePerDay; }

    public Double getRatePerKm() { return ratePerKm; }
    public void setRatePerKm(Double ratePerKm) { this.ratePerKm = ratePerKm; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getImages() { return images; }
    public void setImages(List<String> images) { this.images = images; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Double getAverageRating() { return averageRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }

    public Integer getTotalReviews() { return totalReviews; }
    public void setTotalReviews(Integer totalReviews) { this.totalReviews = totalReviews; }

    public Boolean getIsDeleted() { return isDeleted; }
    public void setIsDeleted(Boolean isDeleted) { this.isDeleted = isDeleted; }
}
