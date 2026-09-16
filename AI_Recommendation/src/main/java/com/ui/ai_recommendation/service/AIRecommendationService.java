package com.ui.ai_recommendation.service;

import com.ui.ai_recommendation.dto.request.RecommendationRequest;
import com.ui.ai_recommendation.dto.response.RecommendationResponse;
import com.ui.ai_recommendation.entity.Vehicle;
import com.ui.ai_recommendation.repository.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AIRecommendationService {

    @Autowired
    private VehicleRepository vehicleRepository;

    public List<RecommendationResponse> recommendVehicles(RecommendationRequest request) {

        List<Vehicle> candidates = (request.getMaxBudget() != null)
                ? vehicleRepository.findByIsDeletedFalseAndStatusAndRentalRatePerDayLessThanEqual(
                        "Available", request.getMaxBudget())
                : vehicleRepository.findByIsDeletedFalseAndStatus("Available");

        return candidates.stream()
                .map(v -> toResponse(v, request))
                .sorted(Comparator.comparing(RecommendationResponse::getMatchScore).reversed())
                .collect(Collectors.toList());
    }

    private RecommendationResponse toResponse(Vehicle vehicle, RecommendationRequest request) {
        RecommendationResponse response = new RecommendationResponse();
        response.setVehicleId(vehicle.getId());
        response.setName(vehicle.getName());
        response.setBrand(vehicle.getBrand());
        response.setModel(vehicle.getModel());
        response.setCategory(vehicle.getCategory());
        response.setRentalRatePerDay(vehicle.getRentalRatePerDay());
        response.setMatchScore(calculateMatchScore(vehicle, request));
        return response;
    }

    // Content-based scoring: how well does this vehicle match the customer's stated preferences.
    // NOTE: this is a rule-based score, not a trained model - the trained models (price/demand)
    // live in the Python ai-service and are called via AIServiceClient. If your rubric requires a
    // trained model for recommendations too, the natural next step is collaborative filtering built
    // from booking history (BookingRepository), which isn't implemented yet.
    private Double calculateMatchScore(Vehicle vehicle, RecommendationRequest request) {
        double score = 0.4;

        if (request.getPreferredType() != null
                && request.getPreferredType().equalsIgnoreCase(vehicle.getCategory())) {
            score += 0.4;
        }

        if (vehicle.getAverageRating() != null) {
            score += Math.min(vehicle.getAverageRating() / 5.0, 1.0) * 0.2;
        }

        return Math.min(score, 1.0);
    }
}
