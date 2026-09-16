package com.ui.ai_recommendation.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.Date;

// Mirrors the Node team's Booking.js Mongoose schema - same collection, same field names.
// customer/vehicle are stored as ObjectId refs in Mongo, so we read them here as plain Strings.
@Document(collection = "bookings")
public class Booking {

    @Id
    private String id;

    @Field("customer")
    private String customerId;

    @Field("vehicle")
    private String vehicleId;

    private Date startDate;
    private Date endDate;
    private Integer rentalDays;
    private Double estimatedCost;
    private Double finalCost;
    private String status;          // Pending, Confirmed, Ongoing, Completed, Cancelled
    private String paymentStatus;   // Unpaid, Paid, Refunded, Failed

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getVehicleId() { return vehicleId; }
    public void setVehicleId(String vehicleId) { this.vehicleId = vehicleId; }

    public Date getStartDate() { return startDate; }
    public void setStartDate(Date startDate) { this.startDate = startDate; }

    public Date getEndDate() { return endDate; }
    public void setEndDate(Date endDate) { this.endDate = endDate; }

    public Integer getRentalDays() { return rentalDays; }
    public void setRentalDays(Integer rentalDays) { this.rentalDays = rentalDays; }

    public Double getEstimatedCost() { return estimatedCost; }
    public void setEstimatedCost(Double estimatedCost) { this.estimatedCost = estimatedCost; }

    // Prefer the final settled cost when present, fall back to the estimate - useful for training data.
    public Double getEffectiveCost() { return finalCost != null ? finalCost : estimatedCost; }

    public Double getFinalCost() { return finalCost; }
    public void setFinalCost(Double finalCost) { this.finalCost = finalCost; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
}
