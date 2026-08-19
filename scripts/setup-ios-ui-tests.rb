#!/usr/bin/env ruby

require 'xcodeproj'

project_path = File.expand_path('../ios/App/App.xcodeproj', __dir__)
project = Xcodeproj::Project.open(project_path)
app_target = project.targets.find { |target| target.name == 'App' }
abort('App target not found') unless app_target

deployment_target = app_target.build_configurations
                              .map { |configuration| configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] }
                              .compact
                              .first || '16.0'

host_target = project.targets.find { |target| target.name == 'AppUITestHost' }
host_target ||= project.new_target(:application, 'AppUITestHost', :ios, deployment_target)

app_target.source_build_phase.files_references.each do |file|
  next if host_target.source_build_phase.files_references.include?(file)

  host_target.source_build_phase.add_file_reference(file)
end

app_target.resources_build_phase.files_references.each do |file|
  next if host_target.resources_build_phase.files_references.include?(file)

  host_target.resources_build_phase.add_file_reference(file)
end


host_target.build_configurations.each do |configuration|
  settings = configuration.build_settings
  settings['CODE_SIGN_STYLE'] = 'Automatic'
  settings['CURRENT_PROJECT_VERSION'] = '1'
  settings['DEVELOPMENT_TEAM'] = '978QLBBDP9'
  settings['INFOPLIST_FILE'] = 'App/Info.plist'
  settings['IPHONEOS_DEPLOYMENT_TARGET'] = deployment_target
  settings['MARKETING_VERSION'] = '1.0'
  settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.wellfit.app.uitesthost'
  settings['PRODUCT_NAME'] = 'Well Fit UI Test Host'
  settings['SWIFT_VERSION'] = '5.0'
  settings['TARGETED_DEVICE_FAMILY'] = '1,2'
end

ui_target = project.targets.find { |target| target.name == 'AppUITests' }
unless ui_target
  ui_target = project.new_target(:ui_test_bundle, 'AppUITests', :ios, deployment_target)
end

ui_target.dependencies.each(&:remove_from_project)
ui_target.add_dependency(host_target)

tests_group = project.main_group.find_subpath('AppUITests', true)
tests_group.set_source_tree('<group>')
test_file_path = File.expand_path('../ios/App/AppUITests/AppLaunchUITests.swift', __dir__)
test_file = tests_group.files.find { |file| file.real_path.to_s == test_file_path }
test_file ||= tests_group.new_file(test_file_path)
unless ui_target.source_build_phase.files_references.include?(test_file)
  ui_target.source_build_phase.add_file_reference(test_file)
end

ui_target.build_configurations.each do |configuration|
  settings = configuration.build_settings
  settings['CODE_SIGN_STYLE'] = 'Automatic'
  settings['DEVELOPMENT_TEAM'] = '978QLBBDP9'
  settings['GENERATE_INFOPLIST_FILE'] = 'YES'
  settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.wellfit.app.uitests'
  settings['PRODUCT_NAME'] = '$(TARGET_NAME)'
  settings['SWIFT_VERSION'] = '5.0'
  settings['TARGETED_DEVICE_FAMILY'] = '1,2'
  settings['TEST_TARGET_NAME'] = 'AppUITestHost'
end

project.save

scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(host_target)
scheme.add_test_target(ui_target)
scheme.set_launch_target(host_target)
scheme.save_as(project_path, 'AppUITests', true)

puts 'AppUITests target and shared scheme are configured.'
