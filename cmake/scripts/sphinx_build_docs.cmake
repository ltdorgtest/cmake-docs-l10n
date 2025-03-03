# Distributed under the OSI-approved BSD 3-Clause License.
# See accompanying file LICENSE.txt for details.

cmake_minimum_required(VERSION 3.25)
get_filename_component(SCRIPT_NAME "${CMAKE_CURRENT_LIST_FILE}" NAME_WE)
set(CMAKE_MESSAGE_INDENT "[${VERSION}][${LANGUAGE}] ")
set(CMAKE_MESSAGE_INDENT_BACKUP "${CMAKE_MESSAGE_INDENT}")
message(STATUS "-------------------- ${SCRIPT_NAME} --------------------")


set(CMAKE_MODULE_PATH   "${PROJ_CMAKE_MODULES_DIR}")
set(Sphinx_ROOT_DIR     "${PROJ_CONDA_DIR}")
find_package(Git        MODULE REQUIRED)
find_package(Gettext    MODULE REQUIRED COMPONENTS Msgcat Msgmerge)
find_package(Sphinx     MODULE REQUIRED COMPONENTS Build)
include(LogUtils)
include(JsonUtils)
include(GettextUtils)


message(STATUS "Removing directory '${PROJ_OUT_REPO_DOCS_LOCALE_DIR}/'...")
if (EXISTS "${PROJ_OUT_REPO_DOCS_LOCALE_DIR}")
    file(REMOVE_RECURSE "${PROJ_OUT_REPO_DOCS_LOCALE_DIR}")
    remove_cmake_message_indent()
    message("")
    message("Directory '${PROJ_OUT_REPO_DOCS_LOCALE_DIR}/' exists.")
    message("Removed '${PROJ_OUT_REPO_DOCS_LOCALE_DIR}/'.")
    message("")
    restore_cmake_message_indent()
else()
    remove_cmake_message_indent()
    message("")
    message("Directory '${PROJ_OUT_REPO_DOCS_LOCALE_DIR}/' does NOT exist.")
    message("No need to remove '${PROJ_OUT_REPO_DOCS_LOCALE_DIR}/'.")
    message("")
    restore_cmake_message_indent()
endif()


message(STATUS "Copying .po files to the local repository...")
if (NOT LANGUAGE STREQUAL "all")
    set(PO_SRC_DIR  "${PROJ_L10N_VERSION_LOCALE_DIR}/${LANGUAGE}")
    set(PO_DST_DIR  "${PROJ_OUT_REPO_DOCS_LOCALE_DIR}/${LANGUAGE}")
else()
    set(PO_SRC_DIR  "${PROJ_L10N_VERSION_LOCALE_DIR}")
    set(PO_DST_DIR  "${PROJ_OUT_REPO_DOCS_LOCALE_DIR}")
endif()
remove_cmake_message_indent()
message("")
message("From: ${PO_SRC_DIR}/")
message("To:   ${PO_DST_DIR}/")
message("")
copy_po_from_src_to_dst(
    IN_SRC_DIR  "${PO_SRC_DIR}"
    IN_DST_DIR  "${PO_DST_DIR}")
message("")
restore_cmake_message_indent()


message(STATUS "Copying 'flyout.js' file to the root of the builder directory...")
file(MAKE_DIRECTORY "${PROJ_OUT_BUILDER_DIR}")
file(COPY_FILE
    "${PROJ_CMAKE_TEMPLATES_DIR}/flyout.js"
    "${PROJ_OUT_BUILDER_DIR}/flyout.js")
remove_cmake_message_indent()
message("")
message("From: ${PROJ_CMAKE_TEMPLATES_DIR}/flyout.js")
message("To:   ${PROJ_OUT_BUILDER_DIR}/flyout.js")
message("")
restore_cmake_message_indent()


file(READ "${LANGUAGES_JSON_PATH}" LANGUAGES_JSON_CNT)
if (NOT LANGUAGE STREQUAL "all")
    set(LANGUAGE_LIST "${LANGUAGE}")
endif()
foreach(_LANGUAGE ${LANGUAGE_LIST})
    get_json_value_by_dot_notation(
        IN_JSON_OBJECT      "${LANGUAGES_JSON_CNT}"
        IN_DOT_NOTATION     ".${_LANGUAGE}.langtag"
        OUT_JSON_VALUE      _LANGTAG)


    set(CURRENT_VERSION     "${VERSION}")
    set(CURRENT_LANGUAGE    "${_LANGTAG}")
    set(HTML_BASEURL        "${BASEURL_HREF}")


    message(STATUS "Configuring 'current.js' file to the builder directory...")
    file(MAKE_DIRECTORY "${PROJ_OUT_BUILDER_DIR}/${_LANGTAG}/${VERSION}")
    configure_file(
        "${PROJ_CMAKE_TEMPLATES_DIR}/current.js.in"
        "${PROJ_OUT_BUILDER_DIR}/${_LANGTAG}/${VERSION}/current.js")
    remove_cmake_message_indent()
    message("")
    message("From: ${PROJ_CMAKE_TEMPLATES_DIR}/current.js")
    message("To:   ${PROJ_OUT_BUILDER_DIR}/${_LANGTAG}/${VERSION}/current.js")
    message("")
    restore_cmake_message_indent()


    message(STATUS "Running 'sphinx-build' command with '${SPHINX_BUILDER}' builder to build documentation for '${_LANGUAGE}' language...")
    if (CMAKE_HOST_UNIX)
        set(ENV_PATH                "${PROJ_CONDA_DIR}/bin:$ENV{PATH}")
        set(ENV_LD_LIBRARY_PATH     "${PROJ_CONDA_DIR}/lib:$ENV{ENV_LD_LIBRARY_PATH}")
        set(ENV_PYTHONPATH          "${PROJ_OUT_REPO_DOCS_EXTNS_DIR}")
        set(ENV_VARS_OF_SYSTEM      PATH=${ENV_PATH}
                                    LD_LIBRARY_PATH=${ENV_LD_LIBRARY_PATH}
                                    PYTHONPATH=${ENV_PYTHONPATH})
    elseif (CMAKE_HOST_WIN32)
        set(ENV_PATH                "${PROJ_CONDA_DIR}/Library/bin"
                                    "${PROJ_CONDA_DIR}/Scripts"
                                    "${PROJ_CONDA_DIR}"
                                    "$ENV{PATH}")
        set(ENV_PYTHONPATH          "${PROJ_OUT_REPO_DOCS_EXTNS_DIR}")
        string(REPLACE ";" "\\\\;"  ENV_PATH "${ENV_PATH}")
        set(ENV_VARS_OF_SYSTEM      PATH=${ENV_PATH}
                                    PYTHONPATH=${ENV_PYTHONPATH})
    else()
        message(FATAL_ERROR "Invalid OS platform. (${CMAKE_HOST_SYSTEM_NAME})")
    endif()
    remove_cmake_message_indent()
    message("")
    execute_process(
        COMMAND ${CMAKE_COMMAND} -E env
                ${ENV_VARS_OF_SYSTEM}
                ${Sphinx_BUILD_EXECUTABLE}
                -b ${SPHINX_BUILDER}
                -D version=${VERSION}
                -D language=${_LANGUAGE}
                -D locale_dirs=${LOCALE_TO_SOURCE_DIR}            # Relative to <sourcedir>.
                -D templates_path=${TMPLS_TO_CONFIG_DIR}          # Relative to <configdir>.
                -D gettext_compact=${GETTEXT_COMPACT}
                -D gettext_additional_targets=${GETTEXT_ADDITIONAL_TARGETS}
                -D enable_switchers=1                             # Passed to custom.py.
                -D current_version=${CURRENT_VERSION}             # Passed to custom.py.
                -D current_language=${CURRENT_LANGUAGE}           # Passed to custom.py.
                -D html_baseurl=${HTML_BASEURL}                   # Passed to custom.py.
                -j ${SPHINX_JOB_NUMBER}
                ${SPHINX_VERBOSE_ARGS}
                -c ${PROJ_OUT_REPO_DOCS_CONFIG_DIR}               # <configdir>, where conf.py locates.
                ${PROJ_OUT_REPO_DOCS_SOURCE_DIR}                  # <sourcedir>, where index.rst locates.
                ${PROJ_OUT_BUILDER_DIR}/${_LANGTAG}/${VERSION}    # <outputdir>, where .html generates.
        WORKING_DIRECTORY ${PROJ_OUT_REPO_DOCS_DIR}
        ECHO_OUTPUT_VARIABLE
        ECHO_ERROR_VARIABLE
        RESULT_VARIABLE RES_VAR
        OUTPUT_VARIABLE OUT_VAR OUTPUT_STRIP_TRAILING_WHITESPACE
        ERROR_VARIABLE  ERR_VAR ERROR_STRIP_TRAILING_WHITESPACE)
    if (RES_VAR EQUAL 0)
        if (ERR_VAR)
            string(APPEND WARNING_REASON
            "The command succeeded but had some warnings.\n\n"
            "    result:\n\n${RES_VAR}\n\n"
            "    stderr:\n\n${ERR_VAR}")
            message("${WARNING_REASON}")
        endif()
    else()
        string(APPEND FAILURE_REASON
        "The command failed with fatal errors.\n\n"
        "    result:\n\n${RES_VAR}\n\n"
        "    stderr:\n\n${ERR_VAR}")
        message(FATAL_ERROR "${FAILURE_REASON}")
    endif()
    message("")
    restore_cmake_message_indent()


    if (REMOVE_REDUNDANT)
        message(STATUS "Removing redundant files/directories...")
        file(REMOVE_RECURSE "${PROJ_OUT_BUILDER_DIR}/${_LANGTAG}/${VERSION}/.doctrees/")
        file(REMOVE         "${PROJ_OUT_BUILDER_DIR}/${_LANGTAG}/${VERSION}/.buildinfo")
        file(REMOVE         "${PROJ_OUT_BUILDER_DIR}/${_LANGTAG}/${VERSION}/objects.inv")
        remove_cmake_message_indent()
        message("")
        message("Removed '${PROJ_OUT_BUILDER_DIR}/${_LANGTAG}/${VERSION}/.doctrees/'.")
        message("Removed '${PROJ_OUT_BUILDER_DIR}/${_LANGTAG}/${VERSION}/.buildinfo'.")
        message("Removed '${PROJ_OUT_BUILDER_DIR}/${_LANGTAG}/${VERSION}/objects.inv'.")
        message("")
        restore_cmake_message_indent()
    endif()
endforeach()
unset(_LANGUAGE)


message(STATUS "Configuring 'index.html.in' file to the root of the builder directory...")
file(MAKE_DIRECTORY "${PROJ_OUT_BUILDER_DIR}")
configure_file(
    "${PROJ_CMAKE_TEMPLATES_DIR}/index.html.in"
    "${PROJ_OUT_BUILDER_DIR}/index.html")
remove_cmake_message_indent()
message("")
message("From: ${PROJ_CMAKE_TEMPLATES_DIR}/index.html")
message("To:   ${PROJ_OUT_BUILDER_DIR}/index.html")
message("")
restore_cmake_message_indent()


message(STATUS "The '${SPHINX_BUILDER}' documentation is built succesfully!")
remove_cmake_message_indent()
message("")
foreach(_LANGUAGE ${LANGUAGE_LIST})
    get_json_value_by_dot_notation(
        IN_JSON_OBJECT    "${LANGUAGES_JSON_CNT}"
        IN_DOT_NOTATION   ".${_LANGUAGE}.langtag"
        OUT_JSON_VALUE    _LANGTAG)
    message("${_LANGUAGE} : ${PROJ_OUT_BUILDER_DIR}/${_LANGTAG}/${VERSION}/index.html")
endforeach()
message("")
restore_cmake_message_indent()
