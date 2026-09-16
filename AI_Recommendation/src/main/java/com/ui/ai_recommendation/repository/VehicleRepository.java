package com.ui.ai_recommendation.repository;

import com.ui.ai_recommendation.entity.Vehicle;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface VehicleRepository extends MongoRepository<Vehicle, String> {
    List<Vehicle> findByIsDeletedFalseAndStatus(String status);
    List<Vehicle> findByIsDeletedFalseAndStatusAndRentalRatePerDayLessThanEqual(String status, Double maxRate);
}
